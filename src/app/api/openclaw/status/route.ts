import { NextResponse } from "next/server";
import { checkGatewayHealth } from "@/lib/openclaw-direct";
import { isTelegramConfigured } from "@/lib/openclaw";

/**
 * GET /api/openclaw/status
 * Health check for both the OpenClaw gateway and Telegram notification config.
 */
export async function GET() {
  const gateway = await checkGatewayHealth();
  const telegram = isTelegramConfigured();

  return NextResponse.json({
    gateway: {
      ok: gateway.ok,
      url: "http://127.0.0.1:18789",
      status: gateway.status || gateway.error,
    },
    telegram: {
      configured: telegram,
      role: "notifications-only",
    },
    integration: "direct-local",
    note: gateway.ok
      ? "OpenClaw gateway is live. Agent execution uses direct CLI calls."
      : "OpenClaw gateway is not reachable. Start it with: openclaw gateway --port 18789",
  });
}
