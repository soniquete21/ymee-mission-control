import { NextResponse } from 'next/server';

type TaskDeliveryPayload = {
  title?: string;
  description?: string;
  owner?: string;
  project?: string;
  priority?: string;
  deliveryMode?: string;
  assignToAgent?: boolean;
  notifyTelegram?: boolean;
  requiresApproval?: boolean;
};

function buildTelegramMessage(task: TaskDeliveryPayload) {
  return [
    'Mission Control task',
    '',
    `Title: ${task.title || 'Untitled'}`,
    `Project: ${task.project || 'Unknown'}`,
    `Owner: ${task.owner || 'Unknown'}`,
    `Priority: ${task.priority || 'Unknown'}`,
    `Delivery: ${task.deliveryMode || 'store_only'}`,
    '',
    task.description || 'No description provided.',
  ].join('\n');
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as TaskDeliveryPayload;

    const gatewayUrl = process.env.OPENCLOW_GATEWAY_URL;
    const gatewayToken = process.env.OPENCLOW_GATEWAY_TOKEN;
    const telegramChatId = process.env.MISSION_CONTROL_TELEGRAM_CHAT_ID;

    if (!gatewayUrl || !gatewayToken || gatewayToken === 'SET_ME_FROM_OPENCLAW_JSON') {
      return NextResponse.json({
        ok: false,
        deliveryStatus: 'stored_only',
        note: 'OpenClaw gateway env vars are not configured yet. Set OPENCLOW_GATEWAY_URL and OPENCLOW_GATEWAY_TOKEN in mission-control/.env.local.',
      }, { status: 500 });
    }

    let telegramSent = false;
    let agentQueued = false;

    if ((body.deliveryMode === 'notify_telegram' || body.deliveryMode === 'notify_and_assign') && telegramChatId) {
      const response = await fetch(`${gatewayUrl}/messages/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${gatewayToken}`,
        },
        body: JSON.stringify({
          channel: 'telegram',
          target: telegramChatId,
          message: buildTelegramMessage(body),
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        return NextResponse.json({
          ok: false,
          deliveryStatus: 'stored_only',
          note: `Telegram send failed: ${text}`,
        }, { status: 500 });
      }

      telegramSent = true;
    }

    if (body.deliveryMode === 'assign_to_agent' || body.deliveryMode === 'notify_and_assign') {
      agentQueued = true;
    }

    return NextResponse.json({
      ok: true,
      telegramSent,
      agentQueued,
      deliveryStatus: telegramSent || agentQueued ? 'queued_for_delivery' : 'stored_only',
      note: telegramSent
        ? 'Telegram notification sent. Agent assignment is marked and ready for the next routing step.'
        : 'Task stored without outbound delivery.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown task delivery error';
    return NextResponse.json({ ok: false, deliveryStatus: 'stored_only', note: message }, { status: 500 });
  }
}
