/**
 * OpenClaw Direct Integration
 *
 * Calls the local OpenClaw gateway directly via CLI (`openclaw agent`)
 * instead of relying on Telegram as a message transport.
 *
 * Requirements:
 *   - `openclaw` must be installed globally (npm i -g openclaw)
 *   - `openclaw gateway` must be running on the configured port
 *   - At least one agent must be configured in ~/.openclaw/openclaw.json
 *
 * Environment variables:
 *   OPENCLAW_AGENT_ID   — agent to use (default: "highrez-agent")
 *   OPENCLAW_TIMEOUT_MS — max wait time in ms (default: 120000)
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const AGENT_ID = process.env.OPENCLAW_AGENT_ID || "highrez-agent";
const TIMEOUT_MS = parseInt(process.env.OPENCLAW_TIMEOUT_MS || "120000", 10);

/** Resolved path to the openclaw binary */
function getOpenClawBin(): string {
  // Common install locations
  const candidates = [
    process.env.OPENCLAW_BIN,
    "/Users/rezafarahani/.npm-global/bin/openclaw",
    "/opt/homebrew/bin/openclaw",
    "/usr/local/bin/openclaw",
    "openclaw", // fallback to PATH
  ].filter(Boolean) as string[];

  return candidates[0];
}

export interface OpenClawResponse {
  ok: boolean;
  text: string;
  runId?: string;
  durationMs?: number;
  model?: string;
  error?: string;
}

/**
 * Send a message to an OpenClaw agent and get a direct response.
 *
 * Uses `openclaw agent --agent <id> --message <msg> --json`
 * which runs a full agent turn through the gateway and returns the result.
 */
export async function sendToAgent(
  message: string,
  opts?: {
    agentId?: string;
    sessionId?: string;
    context?: string; // additional system-level context
  }
): Promise<OpenClawResponse> {
  const agentId = opts?.agentId || AGENT_ID;
  const bin = getOpenClawBin();

  // Build the full message with optional context
  let fullMessage = message;
  if (opts?.context) {
    fullMessage = `[Context: ${opts.context}]\n\n${message}`;
  }

  const args = ["agent", "--agent", agentId, "--message", fullMessage, "--json"];

  if (opts?.sessionId) {
    args.push("--session-id", opts.sessionId);
  }

  try {
    console.log(`📤 [openclaw-direct] Sending to agent "${agentId}"...`);
    const startTime = Date.now();

    const { stdout, stderr } = await execFileAsync(bin, args, {
      timeout: TIMEOUT_MS,
      maxBuffer: 10 * 1024 * 1024, // 10MB
      env: {
        ...process.env,
        PATH: `/Users/rezafarahani/.npm-global/bin:/opt/homebrew/bin:${process.env.PATH}`,
      },
    });

    const elapsed = Date.now() - startTime;

    if (stderr && !stdout) {
      console.error(`❌ [openclaw-direct] stderr: ${stderr.substring(0, 500)}`);
      return { ok: false, text: "", error: stderr.substring(0, 500) };
    }

    // Parse JSON response
    // The stdout may contain diagnostic lines before the JSON
    const jsonStart = stdout.indexOf("{");
    if (jsonStart === -1) {
      console.error(`❌ [openclaw-direct] No JSON in stdout`);
      return { ok: false, text: "", error: "No JSON response from openclaw agent" };
    }

    const jsonStr = stdout.substring(jsonStart);
    const data = JSON.parse(jsonStr);

    if (data.status !== "ok") {
      return {
        ok: false,
        text: "",
        runId: data.runId,
        error: data.error || data.summary || "Agent run failed",
      };
    }

    // Extract text from payloads
    const payloads = data.result?.payloads || [];
    const text = payloads
      .map((p: { text?: string }) => p.text || "")
      .filter(Boolean)
      .join("\n");

    const meta = data.result?.meta?.agentMeta;

    console.log(
      `✅ [openclaw-direct] Response from "${agentId}" in ${elapsed}ms (model: ${meta?.model || "unknown"})`
    );

    return {
      ok: true,
      text,
      runId: data.runId,
      durationMs: data.result?.meta?.durationMs || elapsed,
      model: meta ? `${meta.provider}/${meta.model}` : undefined,
    };
  } catch (error: unknown) {
    const err = error as { message?: string; code?: string; killed?: boolean };
    if (err.killed) {
      return { ok: false, text: "", error: `Agent timed out after ${TIMEOUT_MS}ms` };
    }
    console.error(`❌ [openclaw-direct] Error:`, err.message);
    return { ok: false, text: "", error: err.message || String(error) };
  }
}

/**
 * Execute a task via OpenClaw agent.
 * Builds a structured prompt from task details.
 */
export async function executeTask(task: {
  id: string;
  title: string;
  description?: string | null;
  agentName?: string;
  agentSlug?: string;
}): Promise<OpenClawResponse> {
  const prompt = [
    `You are executing a task from Mission Control.`,
    ``,
    `Task ID: ${task.id}`,
    `Title: ${task.title}`,
    task.description ? `Description: ${task.description}` : null,
    task.agentName ? `Assigned Agent: ${task.agentName}` : null,
    ``,
    `Execute this task and provide your result. Be specific and actionable.`,
    `If the task requires external actions you cannot perform, describe exactly what needs to be done.`,
  ]
    .filter((line) => line !== null)
    .join("\n");

  return sendToAgent(prompt, {
    context: `Mission Control Task Execution — Task "${task.title}"`,
  });
}

/**
 * Check if OpenClaw gateway is reachable.
 */
export async function checkGatewayHealth(): Promise<{
  ok: boolean;
  status?: string;
  error?: string;
}> {
  try {
    const res = await fetch("http://127.0.0.1:18789/health", {
      signal: AbortSignal.timeout(3000),
    });
    const data = await res.json();
    return { ok: data.ok === true, status: data.status };
  } catch {
    return { ok: false, error: "Gateway not reachable at http://127.0.0.1:18789" };
  }
}
