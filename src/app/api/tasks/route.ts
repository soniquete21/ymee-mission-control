import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedUser, getWorkspaceId, apiError } from "@/lib/api-helpers";

export async function GET(req: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return apiError("Unauthorized", 401);

  const workspaceId = await getWorkspaceId(user.id);
  if (!workspaceId) return apiError("No workspace", 403);

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const projectId = searchParams.get("projectId");

  const tasks = await db.task.findMany({
    where: {
      workspaceId,
      ...(status && { status }),
      ...(projectId && { projectId }),
    },
    include: {
      project: { select: { id: true, name: true, slug: true } },
      creator: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true } },
      agent: { select: { id: true, name: true } },
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
  const { title, description, status, priority, projectId, agentId } = body;

  if (!title?.trim()) return apiError("Title required", 400);

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
    },
    include: {
      project: { select: { id: true, name: true, slug: true } },
      creator: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true } },
      agent: { select: { id: true, name: true } },
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

  return NextResponse.json(task, { status: 201 });
}
