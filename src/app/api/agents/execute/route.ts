import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedUser, getWorkspaceId, apiError } from "@/lib/api-helpers";
import { sendTaskToOpenClaw } from "@/lib/openclaw";

/**
 * POST /api/agents/execute
 * Send a task to OpenClaw for agent execution
 */
export async function POST(req: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return apiError("Unauthorized", 401);

  const workspaceId = await getWorkspaceId(user.id);
  if (!workspaceId) return apiError("No workspace", 403);

  const body = await req.json();
  const { taskId, agentId } = body;

  if (!taskId) {
    return apiError("Missing taskId", 400);
  }

  // Get task and agent
  const task = await db.task.findUnique({
    where: { id: taskId },
    include: {
      agent: { select: { name: true } },
      workspace: { select: { id: true } },
    },
  });

  if (!task || task.workspace.id !== workspaceId) {
    return apiError("Task not found", 404);
  }

  // Send to OpenClaw
  const result = await sendTaskToOpenClaw({
    id: task.id,
    title: task.title,
    description: task.description,
    agentName: task.agent?.name,
  });

  if (!result.ok) {
    return apiError(`Failed to send to OpenClaw: ${result.error}`, 500);
  }

  // Create agent run record
  let agentRun = null;
  if (agentId) {
    agentRun = await db.agentRun.create({
      data: {
        agentId,
        taskId,
        status: "running",
      },
      include: {
        task: { select: { id: true, title: true } },
      },
    });
  }

  // Log activity
  await db.activityEvent.create({
    data: {
      actorId: user.id,
      action: "sent task to OpenClaw",
      target: task.title,
      type: "agent",
      taskId,
    },
  });

  return NextResponse.json({
    ok: true,
    message: "Task sent to OpenClaw for execution",
    taskId: task.id,
    run: agentRun,
  });
}
