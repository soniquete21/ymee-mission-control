/**
 * OpenClaw Telegram Notifications (notification-only)
 *
 * Sends optional notifications/alerts to Telegram.
 * NOT used for agent execution — that goes through openclaw-direct.ts
 */

const BOT_TOKEN = process.env.OPENCLAW_TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.OPENCLAW_TELEGRAM_CHAT_ID;

/**
 * Send a notification to Telegram (optional, fire-and-forget).
 * Used for alerts/summaries only — not for execution transport.
 */
export async function notifyTelegram(message: string): Promise<boolean> {
  if (!BOT_TOKEN || !CHAT_ID) return false;

  try {
    const res = await fetch(
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
    const data = await res.json();
    return data.ok === true;
  } catch {
    return false;
  }
}

/**
 * Notify Telegram that a task was completed (optional alert).
 */
export async function notifyTaskCompleted(task: {
  title: string;
  agentName?: string;
  result?: string;
}): Promise<boolean> {
  const msg = [
    `✅ *Task Completed*`,
    `*Title:* ${task.title}`,
    task.agentName ? `*Agent:* ${task.agentName}` : null,
    task.result ? `*Result:* ${task.result.substring(0, 200)}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return notifyTelegram(msg);
}

/**
 * Notify Telegram about a new task assignment (optional alert).
 */
export async function notifyTaskAssigned(task: {
  title: string;
  agentName?: string;
}): Promise<boolean> {
  const msg = [
    `🎯 *Task Assigned*`,
    `*Title:* ${task.title}`,
    task.agentName ? `*Agent:* ${task.agentName}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return notifyTelegram(msg);
}

/**
 * Check if Telegram notifications are configured.
 */
export function isTelegramConfigured(): boolean {
  return !!(BOT_TOKEN && CHAT_ID);
}
