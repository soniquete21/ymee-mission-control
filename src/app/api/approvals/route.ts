import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedUser, getWorkspaceId, apiError } from "@/lib/api-helpers";

/**
 * GET /api/approvals
 * Returns tasks with status "review" (pending approval)
 * and recently approved/rejected tasks
 */
export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return apiError("Unauthorized", 401);

  const workspaceId = await getWorkspaceId(user.id);
  if (!workspaceId) return apiError("No workspace", 403);

  const [pending, resolved] = await Promise.all([
    // Pending approvals
    db.task.findMany({
      where: { workspaceId, status: "review" },
      include: {
        creator: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
        agent: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    // Recently resolved (done or back to in_progress from review)
    db.activityEvent.findMany({
      where: {
        task: { workspaceId },
        action: { in: ["approved", "rejected"] },
      },
      include: {
        actor: { select: { id: true, name: true } },
        task: { select: { id: true, title: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  return NextResponse.json({ pending, resolved });
}

/**
 * POST /api/approvals
 * Approve or reject a task
 * Body: { taskId, action: "approve" | "reject", comment?: string }
 */
export async function POST(req: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return apiError("Unauthorized", 401);

  const workspaceId = await getWorkspaceId(user.id);
  if (!workspaceId) return apiError("No workspace", 403);

  const { taskId, action, comment } = await req.json();

  if (!taskId || !["approve", "reject"].includes(action)) {
    return apiError("taskId and action (approve|reject) required", 400);
  }

  // Verify task exists and is in review
  const task = await db.task.findFirst({
    where: { id: taskId, workspaceId, status: "review" },
  });

  if (!task) {
    return apiError("Task not found or not in review status", 404);
  }

  const newStatus = action === "approve" ? "done" : "in_progress";
  const progressNote =
    action === "approve"
      ? `Approved by ${user.name}${comment ? `: ${comment}` : ""}`
      : `Rejected by ${user.name}${comment ? `: ${comment}` : ""}`;

  // Update task
  const updatedTask = await db.task.update({
    where: { id: taskId },
    data: {
      status: newStatus,
      progressNote,
    },
  });

  // Log activity
  await db.activityEvent.create({
    data: {
      actorId: user.id,
      action: action === "approve" ? "approved" : "rejected",
      target: `${task.title}${comment ? `: ${comment}` : ""}`,
      type: "task",
      taskId: task.id,
      projectId: task.projectId,
    },
  });

  // If rejected, add a comment message so the agent/assignee knows why
  if (action === "reject" && comment) {
    await db.message.create({
      data: {
        content: `Approval rejected: ${comment}`,
        senderId: user.id,
        taskId: task.id,
      },
    });
  }

  return NextResponse.json({
    ok: true,
    action,
    task: updatedTask,
  });
}
