import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedUser, apiError } from "@/lib/api-helpers";
import { sendToAgent } from "@/lib/openclaw-direct";
import { notifyTelegram } from "@/lib/openclaw";

/**
 * POST /api/chat/send
 *
 * 1. Store user message in DB
 * 2. Call OpenClaw agent directly (synchronous, real response)
 * 3. Store agent response in DB
 * 4. Return both messages
 * 5. Optionally notify Telegram (fire-and-forget)
 */
export async function POST(req: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return apiError("Unauthorized", 401);

  const body = await req.json();
  const { content, agentId, taskId, projectId } = body;

  if (!content?.trim()) return apiError("Content required", 400);

  // 1. Store user message
  const userMessage = await db.message.create({
    data: {
      content: content.trim(),
      senderId: user.id,
      agentId: agentId || null,
      taskId: taskId || null,
      projectId: projectId || null,
    },
    include: {
      sender: { select: { id: true, name: true } },
      agent: { select: { id: true, name: true } },
    },
  });

  // 2. Get agent context for the prompt
  let agentName = "Agent";
  let agentSlug = "";
  if (agentId) {
    const agent = await db.agent.findUnique({
      where: { id: agentId },
      select: { name: true, slug: true, role: true, skills: true },
    });
    if (agent) {
      agentName = agent.name;
      agentSlug = agent.slug;
    }
  }

  // Build task context if chatting about a specific task
  let taskContext = "";
  if (taskId) {
    const task = await db.task.findUnique({
      where: { id: taskId },
      select: { title: true, status: true, description: true },
    });
    if (task) {
      taskContext = `Task: "${task.title}" (status: ${task.status})${task.description ? ` — ${task.description.substring(0, 200)}` : ""}`;
    }
  }

  // 3. Call OpenClaw agent directly
  const response = await sendToAgent(content.trim(), {
    context: taskContext || `Chat with ${agentName} in Mission Control`,
  });

  let agentMessage = null;

  if (response.ok && response.text) {
    // 4. Store agent response in DB
    agentMessage = await db.message.create({
      data: {
        content: response.text,
        agentId: agentId || null,
        taskId: taskId || null,
        projectId: projectId || null,
        // senderId is null — this is an agent message
      },
      include: {
        sender: { select: { id: true, name: true } },
        agent: { select: { id: true, name: true } },
      },
    });
  }

  // 5. Optional Telegram notification (fire-and-forget, non-blocking)
  if (agentMessage) {
    notifyTelegram(
      `💬 *${agentName}* replied in Mission Control:\n${response.text.substring(0, 200)}`
    ).catch(() => {}); // swallow errors — notification is optional
  }

  return NextResponse.json({
    userMessage,
    agentMessage,
    agentResponse: {
      ok: response.ok,
      durationMs: response.durationMs,
      model: response.model,
      error: response.error,
    },
  });
}
