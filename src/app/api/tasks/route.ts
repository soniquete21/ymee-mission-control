import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedUser, getWorkspaceId, isAdmin, apiError } from "@/lib/api-helpers";
import { sendTaskToOpenClaw } from "@/lib/openclaw";

export async function GET(req: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return apiError("Unauthorized", 401);

  const workspaceId = await getWorkspaceId(user.id);
  if (!workspaceId) return apiError("No workspace", 403);

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const projectId = searchParams.get("projectId");
  const admin = isAdmin(user);

  const tasks = await db.task.findMany({
    where: {
      workspaceId,
      ...(status && { status }),
      ...(projectId && { projectId }),
      // Non-admin cannot see tasks assigned to admin-only agents
      ...(!admin && {
        OR: [
          { agent: null },
          { agent: { visibility: "all" } },
        ],
      }),
    },
    include: {
      project: { select: { id: true, name: true, slug: true } },
      creator: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true } },
      agent: { select: { id: true, name: true, slug: true, type: true, visibility: true } },
    },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(tasks);
}

export async function POST(req: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return apiError("Unauthorized", 401);

  const workspaceId = await getWorkspaceId(user.id);
  if (!workspaceId) return apiError("No workspace", 403);

  const body = await req.json();
  const { title, description, status, priority, projectId, agentId, needsAudit } = body;

  if (!title?.trim()) return apiError("Title required", 400);

  // If assigning to an admin-only agent, user must be admin
  if (agentId) {
    const agent = await db.agent.findUnique({ where: { id: agentId }, select: { visibility: true } });
    if (agent?.visibility === "admin" && !isAdmin(user)) {
      return apiError("Cannot assign to this agent", 403);
    }
  }

  const workflowState = agentId ? "assigned" : "unassigned";

  const task = await db.task.create({
    data: {
      workspaceId,
      title: title.trim(),
      description: description?.trim() || null,
      status: status || "backlog",
      priority: priority || "medium",
      projectId: projectId || null,
      agentId: agentId || null,
      creatorId: user.id,
      workflowState,
      needsAudit: needsAudit || false,
    },
    include: {
      project: { select: { id: true, name: true, slug: true } },
      creator: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true } },
      agent: { select: { id: true, name: true, slug: true, type: true, visibility: true } },
    },
  });

  // Log activity
  await db.activityEvent.create({
    data: {
      actorId: user.id,
      action: "created task",
      target: task.title,
      type: "task",
      taskId: task.id,
      projectId: task.projectId,
    },
  });

  // Auto-send to OpenClaw when task has an agent assigned
  if (task.agentId && task.agent) {
    const openclawResult = await sendTaskToOpenClaw({
      id: task.id,
      title: task.title,
      description: task.description,
      agentName: task.agent.name,
    });

    if (openclawResult.ok) {
      await db.agentRun.create({
        data: { agentId: task.agentId, taskId: task.id, status: "running" },
      });
      await db.activityEvent.create({
        data: {
          actorId: user.id,
          action: "auto-sent to OpenClaw",
          target: task.title,
          type: "agent",
          taskId: task.id,
        },
      });
    }
  }

  return NextResponse.json(task, { status: 201 });
}
