import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedUser, getWorkspaceId, apiError } from "@/lib/api-helpers";

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
      agent: { select: { id: true, name: true } },
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
  ];

  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) data[key] = body[key];
  }

  const task = await db.task.update({
    where: { id: taskId },
    data,
    include: {
      project: { select: { id: true, name: true, slug: true } },
      creator: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true } },
      agent: { select: { id: true, name: true } },
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
