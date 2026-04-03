import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedUser, getWorkspaceId, apiError } from "@/lib/api-helpers";
import { executeTask } from "@/lib/openclaw-direct";
import { notifyTaskCompleted } from "@/lib/openclaw";

/**
 * POST /api/agents/execute
 * Execute a task via OpenClaw agent directly (no Telegram transport).
 * Returns the real agent response.
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
      agent: { select: { id: true, name: true, slug: true } },
      workspace: { select: { id: true } },
    },
  });

  if (!task || task.workspace.id !== workspaceId) {
    return apiError("Task not found", 404);
  }

  // Update task status to in_progress
  await db.task.update({
    where: { id: taskId },
    data: {
      status: "in_progress",
      workflowState: "in_work",
    },
  });

  // Execute via OpenClaw directly
  const result = await executeTask({
    id: task.id,
    title: task.title,
    description: task.description,
    agentName: task.agent?.name,
    agentSlug: task.agent?.slug,
  });

  // Create agent run record
  const effectiveAgentId = agentId || task.agentId;
  let agentRun = null;

  if (effectiveAgentId) {
    agentRun = await db.agentRun.create({
      data: {
        agentId: effectiveAgentId,
        taskId,
        status: result.ok ? "completed" : "failed",
        result: result.text || result.error || null,
        startedAt: new Date(),
        endedAt: new Date(),
      },
      include: {
        task: { select: { id: true, title: true } },
      },
    });

    // Store the response as an AgentOutput
    if (result.text) {
      await db.agentOutput.create({
        data: {
          runId: agentRun.id,
          kind: "text",
          content: result.text,
          metadata: JSON.stringify({
            model: result.model,
            durationMs: result.durationMs,
            runId: result.runId,
          }),
          order: 0,
        },
      });
    }
  }

  // Update task based on result
  if (result.ok) {
    await db.task.update({
      where: { id: taskId },
      data: {
        status: "done",
        workflowState: "completed",
        progressNote: result.text?.substring(0, 500) || "Completed by agent",
      },
    });
  } else {
    await db.task.update({
      where: { id: taskId },
      data: {
        status: "backlog",
        workflowState: "assigned",
        blocked: true,
        progressNote: `Agent execution failed: ${result.error || "Unknown error"}`,
      },
    });
  }

  // Log activity
  await db.activityEvent.create({
    data: {
      actorId: user.id,
      action: result.ok
        ? `executed by ${task.agent?.name || "agent"}`
        : `execution failed — ${task.agent?.name || "agent"}`,
      target: task.title,
      type: "agent",
      taskId,
    },
  });

  // Optional Telegram notification (fire-and-forget)
  if (result.ok) {
    notifyTaskCompleted({
      title: task.title,
      agentName: task.agent?.name,
      result: result.text,
    }).catch(() => {});
  }

  return NextResponse.json({
    ok: result.ok,
    message: result.ok
      ? "Task executed successfully"
      : `Execution failed: ${result.error}`,
    taskId: task.id,
    run: agentRun,
    response: {
      text: result.text,
      durationMs: result.durationMs,
      model: result.model,
    },
  });
}
