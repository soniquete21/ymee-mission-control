import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedUser, getWorkspaceId, apiError } from "@/lib/api-helpers";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;
  const user = await getAuthenticatedUser();
  if (!user) return apiError("Unauthorized", 401);

  const workspaceId = await getWorkspaceId(user.id);
  if (!workspaceId) return apiError("No workspace", 403);

  // Verify agent belongs to workspace
  const agent = await db.agent.findUnique({
    where: { id: agentId },
    select: { workspaceId: true },
  });

  if (!agent || agent.workspaceId !== workspaceId) {
    return apiError("Agent not found", 404);
  }

  const runs = await db.agentRun.findMany({
    where: { agentId },
    include: {
      task: { select: { id: true, title: true } },
      outputs: { orderBy: { order: "asc" } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json(runs);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;
  const user = await getAuthenticatedUser();
  if (!user) return apiError("Unauthorized", 401);

  const workspaceId = await getWorkspaceId(user.id);
  if (!workspaceId) return apiError("No workspace", 403);

  const body = await req.json();
  const { taskId } = body;

  if (!taskId) {
    return apiError("Missing taskId", 400);
  }

  // Verify agent belongs to workspace
  const agent = await db.agent.findUnique({
    where: { id: agentId },
    select: { workspaceId: true },
  });

  if (!agent || agent.workspaceId !== workspaceId) {
    return apiError("Agent not found", 404);
  }

  // Verify task exists and belongs to workspace
  const task = await db.task.findUnique({
    where: { id: taskId },
    select: { workspaceId: true },
  });

  if (!task || task.workspaceId !== workspaceId) {
    return apiError("Task not found", 404);
  }

  // Create agent run
  const run = await db.agentRun.create({
    data: {
      agentId,
      taskId,
      status: "pending",
    },
    include: {
      task: { select: { id: true, title: true } },
      outputs: true,
    },
  });

  // Log activity
  await db.activityEvent.create({
    data: {
      actorId: user.id,
      action: "assigned agent run",
      target: `Agent run on task`,
      type: "agent",
      taskId,
    },
  });

  return NextResponse.json(run, { status: 201 });
}
