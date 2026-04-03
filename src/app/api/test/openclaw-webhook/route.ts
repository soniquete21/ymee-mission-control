import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Test endpoint to simulate OpenClaw sending a webhook
 * GET /api/test/openclaw-webhook?taskId=xxx&result=done
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const taskId = searchParams.get("taskId");
  const result = searchParams.get("result") || "Completed via OpenClaw";

  if (!taskId) {
    return NextResponse.json(
      { error: "Missing taskId parameter" },
      { status: 400 }
    );
  }

  try {
    // Find the task
    const task = await db.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      return NextResponse.json(
        { error: `Task ${taskId} not found` },
        { status: 404 }
      );
    }

    // Update task as if OpenClaw sent the result
    const updated = await db.task.update({
      where: { id: taskId },
      data: {
        status: "done",
        progressNote: result,
      },
    });

    // Log activity
    await db.activityEvent.create({
      data: {
        actorId: task.creatorId,
        action: "completed via OpenClaw",
        target: task.title,
        type: "task",
        taskId: task.id,
      },
    });

    return NextResponse.json({
      ok: true,
      message: "Task updated as if OpenClaw sent it",
      task: updated,
    });
  } catch (error) {
    console.error("Test webhook error:", error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
