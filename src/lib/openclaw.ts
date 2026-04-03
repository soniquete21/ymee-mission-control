/**
 * OpenClaw Integration
 * 
 * Sends tasks to OpenClaw via Telegram bot
 * Receives results via webhook at /api/webhooks/openclaw
 */

const BOT_TOKEN = process.env.OPENCLAW_TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.OPENCLAW_TELEGRAM_CHAT_ID;
const WEBHOOK_URL = process.env.MISSION_CONTROL_WEBHOOK_URL || "http://localhost:3000/api/webhooks/openclaw";

if (!BOT_TOKEN || !CHAT_ID) {
  console.warn("⚠️  OpenClaw Telegram credentials not configured. Set OPENCLAW_TELEGRAM_BOT_TOKEN and OPENCLAW_TELEGRAM_CHAT_ID");
}

/**
 * Send a task to OpenClaw via Telegram
 * OpenClaw will receive it and can execute agents on it
 */
export async function sendTaskToOpenClaw(task: {
  id: string;
  title: string;
  description?: string | null;
  agentId?: string;
  agentName?: string;
}) {
  if (!BOT_TOKEN || !CHAT_ID) {
    console.error("❌ OpenClaw credentials missing");
    return { ok: false, error: "Missing credentials: OPENCLAW_TELEGRAM_BOT_TOKEN or OPENCLAW_TELEGRAM_CHAT_ID" };
  }

  try {
    const message = `🎯 **New Task from Mission Control**
    
**Task ID:** \`${task.id}\`
**Title:** ${task.title}
**Description:** ${task.description || "No description"}
${task.agentName ? `**Agent:** ${task.agentName}` : "**Agent:** Any available"}

**Webhook:** ${WEBHOOK_URL}

Reply with the task result and the webhook will be notified.`;

    console.log(`📤 Sending task ${task.id} to OpenClaw...`);

    const response = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          text: message,
          parse_mode: "Markdown",
        }),
      }
    );

    const data = await response.json();

    if (!data.ok) {
      console.error("❌ Failed to send to OpenClaw:", data);
      return { ok: false, error: data.description || "Failed to send message" };
    }

    console.log(`✅ Task sent to OpenClaw (message ID: ${data.result.message_id})`);
    return { ok: true, messageId: data.result.message_id };
  } catch (error) {
    console.error("❌ OpenClaw integration error:", error);
    return { ok: false, error: String(error) };
  }
}

/**
 * Assign a specific agent to execute a task in OpenClaw
 */
export async function assignAgentInOpenClaw(
  taskId: string,
  agentName: string,
  taskTitle: string
) {
  if (!BOT_TOKEN || !CHAT_ID) {
    return { ok: false, error: "Missing credentials" };
  }

  try {
    const message = `/agent ${agentName}
task_id: ${taskId}
task: ${taskTitle}
webhook: ${WEBHOOK_URL}`;

    console.log(`📤 Assigning agent ${agentName} to task ${taskId}...`);

    const response = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          text: message,
        }),
      }
    );

    const data = await response.json();
    console.log(`✅ Agent assignment sent to OpenClaw`);
    return { ok: data.ok };
  } catch (error) {
    console.error("❌ Failed to assign agent:", error);
    return { ok: false, error: String(error) };
  }
}

/**
 * Get OpenClaw status
 */
export async function getOpenClawStatus() {
  if (!BOT_TOKEN || !CHAT_ID) {
    return { ok: false, configured: false };
  }

  return {
    ok: true,
    configured: true,
    botToken: BOT_TOKEN?.substring(0, 20) + "...",
    chatId: CHAT_ID,
    webhookUrl: WEBHOOK_URL,
  };
}
