import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * OpenClaw Agent Callback Webhook
 * POST /api/webhooks/openclaw
 *
 * Supports event types:
 *   task.completed  — mark task done, store result
 *   task.progress   — update progress note, keep status
 *   task.blocked    — mark task blocked with reason
 *   task.comment    — append agent comment to activity log
 *   task.approval_requested — flag task for approval
 *   task.failed     — mark task failed with error
 *   chat.reply      — agent sends a chat message (no task required)
 *
 * Payload:
 * {
 *   "eventType": "task.completed",
 *   "taskId": "...",
 *   "agent": "Main Agent",
 *   "status": "completed",
 *   "message": "Summary here",
 *   "result": "Detailed output here",
 *   "timestamp": "2026-04-01T16:30:00Z"
 * }
 *
 * Also accepts legacy format: { taskId, status, result }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Support both new eventType format and legacy format
    const eventType = body.eventType || (body.status === "completed" ? "task.completed" : "task.progress");
    const taskId = body.taskId;
    const agent = body.agent || "OpenClaw";
    const message = body.message || body.result || body.output || "";
    const timestamp = body.timestamp || new Date().toISOString();

    // Handle chat.reply — no task required
    if (eventType === "chat.reply") {
      return handleChatReply(body, agent, message);
    }

    if (!taskId) {
      return NextResponse.json(
        { error: "Missing taskId" },
        { status: 400 }
      );
    }

    // Verify task exists
    const existingTask = await db.task.findUnique({
      where: { id: taskId },
      select: { id: true, title: true, creatorId: true, projectId: true },
    });

    if (!existingTask) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      );
    }

    // Route by event type
    switch (eventType) {
      case "task.completed": {
        await db.task.update({
          where: { id: taskId },
          data: {
            status: "done",
            progressNote: message || "Completed by agent",
            blocked: false,
          },
        });
        await logActivity(existingTask, `completed by ${agent}`, message);
        break;
      }

      case "task.progress": {
        await db.task.update({
          where: { id: taskId },
          data: {
            status: "in_progress",
            progressNote: message,
          },
        });
        await logActivity(existingTask, `progress update from ${agent}`, message);
        break;
      }

      case "task.blocked": {
        await db.task.update({
          where: { id: taskId },
          data: {
            blocked: true,
            progressNote: message || "Blocked by agent",
          },
        });
        await logActivity(existingTask, `blocked by ${agent}`, message);
        break;
      }

      case "task.comment": {
        // Add as chat message on the task
        await db.message.create({
          data: {
            content: message,
            taskId,
          },
        });
        await logActivity(existingTask, `comment from ${agent}`, message);
        break;
      }

      case "task.approval_requested": {
        await db.task.update({
          where: { id: taskId },
          data: {
            status: "review",
            progressNote: message || "Approval requested by agent",
          },
        });
        await logActivity(existingTask, `approval requested by ${agent}`, message);
        break;
      }

      case "task.failed": {
        await db.task.update({
          where: { id: taskId },
          data: {
            status: "backlog",
            blocked: true,
            progressNote: message || "Failed",
          },
        });
        await logActivity(existingTask, `failed — ${agent}`, message);
        break;
      }

      default: {
        // Fallback: treat as progress update
        await db.task.update({
          where: { id: taskId },
          data: { progressNote: message },
        });
        await logActivity(existingTask, `${eventType} from ${agent}`, message);
      }
    }

    // Fetch updated task to return
    const task = await db.task.findUnique({ where: { id: taskId } });

    return NextResponse.json({
      ok: true,
      eventType,
      taskId,
      agent,
      message: "Callback processed",
      task,
    });
  } catch (error) {
    console.error("OpenClaw webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed", details: String(error) },
      { status: 500 }
    );
  }
}

/** Handle chat.reply — agent sends a message to the chat */
async function handleChatReply(
  body: { agentSlug?: string; agentId?: string; agent?: string; message?: string; content?: string; taskId?: string; projectId?: string },
  agentName: string,
  message: string
) {
  // Resolve agent by slug, id, or name
  let agentRecord = null;
  if (body.agentId) {
    agentRecord = await db.agent.findUnique({ where: { id: body.agentId } });
  }
  if (!agentRecord && body.agentSlug) {
    agentRecord = await db.agent.findFirst({ where: { slug: body.agentSlug } });
  }
  if (!agentRecord) {
    // Try to match by name
    agentRecord = await db.agent.findFirst({
      where: { name: { contains: agentName, mode: "insensitive" } },
    });
  }

  const content = message || body.content || "";
  if (!content) {
    return NextResponse.json({ error: "Missing message content" }, { status: 400 });
  }

  const chatMessage = await db.message.create({
    data: {
      content,
      agentId: agentRecord?.id || null,
      taskId: body.taskId || null,
      projectId: body.projectId || null,
    },
    include: {
      sender: { select: { id: true, name: true } },
      agent: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({
    ok: true,
    eventType: "chat.reply",
    agent: agentName,
    message: "Chat reply stored",
    chatMessage,
  });
}

/** Log an activity event for a task */
async function logActivity(
  task: { id: string; title: string; creatorId: string; projectId: string | null },
  action: string,
  detail: string
) {
  await db.activityEvent.create({
    data: {
      actorId: task.creatorId,
      action,
      target: detail ? `${task.title}: ${detail.substring(0, 200)}` : task.title,
      type: "task",
      taskId: task.id,
      projectId: task.projectId,
    },
  });
}

/**
 * GET /api/webhooks/openclaw
 * Health check and payload documentation
 */
export async function GET() {
  return NextResponse.json({
    status: "ready",
    webhook: "/api/webhooks/openclaw",
    supportedEvents: [
      "task.completed",
      "task.progress",
      "task.blocked",
      "task.comment",
      "task.approval_requested",
      "task.failed",
      "chat.reply",
    ],
    examplePayload: {
      eventType: "task.completed",
      taskId: "your-task-id",
      agent: "Main Agent",
      status: "completed",
      message: "Done!",
      result: "Summary or output here",
      timestamp: "2026-04-01T16:30:00Z",
    },
    legacyFormat: {
      taskId: "your-task-id",
      status: "completed|failed",
      result: "string (optional)",
    },
  });
}
