import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedUser, apiError } from "@/lib/api-helpers";

const BOT_TOKEN = process.env.OPENCLAW_TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.OPENCLAW_TELEGRAM_CHAT_ID;
const WEBHOOK_URL =
  process.env.MISSION_CONTROL_WEBHOOK_URL ||
  "http://localhost:3000/api/webhooks/openclaw";

/**
 * POST /api/chat/send
 *
 * 1. Store user message in DB
 * 2. Send to OpenClaw via Telegram Bot API (fire-and-forget)
 *    — includes webhook URL + agentId so OpenClaw can call back
 * 3. Return immediately — agent replies arrive via webhook
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

  // 2. Send to OpenClaw via Telegram (non-blocking)
  let telegramSent = false;
  if (BOT_TOKEN && CHAT_ID) {
    try {
      // Get agent name + slug for context
      let agentName = "Agent";
      let agentSlug = "";
      if (agentId) {
        const agent = await db.agent.findUnique({
          where: { id: agentId },
          select: { name: true, slug: true },
        });
        if (agent) {
          agentName = agent.name;
          agentSlug = agent.slug;
        }
      }

      // Build contextual message with task info
      let taskContext = "";
      if (taskId) {
        const task = await db.task.findUnique({
          where: { id: taskId },
          select: { title: true, status: true },
        });
        if (task) {
          taskContext = `\n[Task: ${task.title} | Status: ${task.status}]`;
        }
      }

      // Format: user message + callback instructions for OpenClaw
      const telegramText = [
        `[Mission Control Chat → ${agentName}]`,
        taskContext,
        `\n${content.trim()}`,
        `\n---`,
        `Reply via webhook:`,
        `POST ${WEBHOOK_URL}`,
        `{"eventType":"chat.reply","agent":"${agentName}","agentSlug":"${agentSlug}","message":"your reply here"}`,
      ]
        .filter(Boolean)
        .join("\n");

      const sendRes = await fetch(
        `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: CHAT_ID,
            text: telegramText,
          }),
        }
      );
      const sendData = await sendRes.json();
      telegramSent = sendData.ok === true;

      if (!telegramSent) {
        console.error("Telegram send failed:", sendData);
      }
    } catch (err) {
      console.error("Telegram send error:", err);
    }
  }

  // 3. Return immediately
  return NextResponse.json({
    userMessage,
    telegramSent,
    note: telegramSent
      ? "Message sent to OpenClaw. Agent reply will appear when ready."
      : "Message saved. OpenClaw relay not available — agent can still reply via webhook.",
  });
}
