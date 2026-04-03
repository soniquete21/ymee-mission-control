import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedUser, getWorkspaceId, isAdmin, apiError } from "@/lib/api-helpers";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const user = await getAuthenticatedUser();
  if (!user) return apiError("Unauthorized", 401);

  const { taskId } = await params;

  const task = await db.task.findUnique({
    where: { id: taskId },
    include: {
      project: { select: { id: true, name: true, slug: true } },
      creator: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true } },
      agent: { select: { id: true, name: true, slug: true, type: true, visibility: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        include: {
          sender: { select: { id: true, name: true } },
          agent: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!task) return apiError("Task not found", 404);

  // Block non-admin from seeing tasks on admin-only agents
  if (task.agent?.visibility === "admin" && !isAdmin(user)) {
    return apiError("Task not found", 404);
  }

  return NextResponse.json(task);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const user = await getAuthenticatedUser();
  if (!user) return apiError("Unauthorized", 401);

  const { taskId } = await params;
  const body = await req.json();

  const allowed = [
    "title", "description", "status", "priority",
    "blocked", "progressNote", "order", "projectId",
    "assigneeId", "agentId", "dueDate",
    "workflowState", "routingReason", "needsAudit",
  ];

  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) data[key] = body[key];
  }

  // Auto-set workflow state when assigning agent
  if ("agentId" in body && body.agentId && !("workflowState" in body)) {
    data.workflowState = "assigned";
  }
  if ("agentId" in body && !body.agentId && !("workflowState" in body)) {
    data.workflowState = "unassigned";
  }

  // If assigning to admin-only agent, check permissions
  if (data.agentId) {
    const agent = await db.agent.findUnique({ where: { id: data.agentId as string }, select: { visibility: true } });
    if (agent?.visibility === "admin" && !isAdmin(user)) {
      return apiError("Cannot assign to this agent", 403);
    }
  }

  const task = await db.task.update({
    where: { id: taskId },
    data,
    include: {
      project: { select: { id: true, name: true, slug: true } },
      creator: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true } },
      agent: { select: { id: true, name: true, slug: true, type: true, visibility: true } },
    },
  });

  // Log status changes
  if ("status" in body) {
    await db.activityEvent.create({
      data: {
        actorId: user.id,
        action: `moved to ${body.status}`,
        target: task.title,
        type: "task",
        taskId: task.id,
        projectId: task.projectId,
      },
    });
  }

  // Log agent assignment
  if ("agentId" in body && body.agentId) {
    await db.activityEvent.create({
      data: {
        actorId: user.id,
        action: `assigned to ${task.agent?.name || "agent"}`,
        target: task.title,
        type: "agent_assignment",
        taskId: task.id,
      },
    });
  }

  // Log workflow state changes
  if ("workflowState" in body) {
    await db.activityEvent.create({
      data: {
        actorId: user.id,
        action: `workflow → ${body.workflowState}`,
        target: task.title,
        type: "workflow",
        taskId: task.id,
      },
    });
  }

  return NextResponse.json(task);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const user = await getAuthenticatedUser();
  if (!user) return apiError("Unauthorized", 401);

  const { taskId } = await params;

  const task = await db.task.findUnique({ where: { id: taskId } });
  if (!task) return apiError("Task not found", 404);

  await db.task.delete({ where: { id: taskId } });

  await db.activityEvent.create({
    data: {
      actorId: user.id,
      action: "deleted task",
      target: task.title,
      type: "task",
    },
  });

  return NextResponse.json({ ok: true });
}
