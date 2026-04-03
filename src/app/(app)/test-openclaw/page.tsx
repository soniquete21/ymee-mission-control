"use client";

import { useState } from "react";

export default function TestOpenClawPage() {
  const [taskId, setTaskId] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);

  async function testWebhook() {
    if (!taskId.trim()) {
      alert("Please enter a task ID");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `/api/webhooks/openclaw`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            taskId,
            status: "completed",
            result: result || "Completed via OpenClaw",
          }),
        }
      );

      const data = await res.json();
      setResponse(data);

      if (data.ok) {
        alert("✓ Task updated! Refresh the tasks page to see it marked as Done");
      }
    } catch (error) {
      setResponse({ error: String(error) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Test OpenClaw Webhook</h1>

      <div className="panel rounded-xl p-6 max-w-lg">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium" style={{ color: "var(--muted)" }}>
              Task ID (copy from a task card)
            </label>
            <input
              type="text"
              value={taskId}
              onChange={(e) => setTaskId(e.target.value)}
              placeholder="Paste task ID here"
              className="w-full mt-1 px-3 py-2 rounded-lg text-sm"
              style={{
                background: "var(--panel-strong)",
                border: "1px solid var(--border)",
                color: "var(--text)",
              }}
            />
          </div>

          <div>
            <label className="text-sm font-medium" style={{ color: "var(--muted)" }}>
              Result Message (optional)
            </label>
            <input
              type="text"
              value={result}
              onChange={(e) => setResult(e.target.value)}
              placeholder="e.g., Analysis complete"
              className="w-full mt-1 px-3 py-2 rounded-lg text-sm"
              style={{
                background: "var(--panel-strong)",
                border: "1px solid var(--border)",
                color: "var(--text)",
              }}
            />
          </div>

          <button
            onClick={testWebhook}
            disabled={loading}
            className="w-full px-4 py-2.5 rounded-lg text-sm font-medium"
            style={{
              background: "var(--accent)",
              color: "#fff",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Testing..." : "Simulate OpenClaw Response"}
          </button>
        </div>

        {response && (
          <div className="mt-4 p-3 rounded-lg" style={{ background: "var(--panel)" }}>
            <p className="text-xs font-mono" style={{ color: "var(--muted)" }}>
              {JSON.stringify(response, null, 2)}
            </p>
          </div>
        )}
      </div>

      <div className="panel rounded-xl p-5" style={{ background: "rgba(45, 212, 191, 0.1)" }}>
        <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--success)" }}>
          ✓ How to use:
        </h3>
        <ol className="text-sm space-y-1" style={{ color: "var(--text)" }}>
          <li>1. Go to Tasks and create a task</li>
          <li>2. Click the task ID to copy it</li>
          <li>3. Come back here and paste it above</li>
          <li>4. Click "Simulate OpenClaw Response"</li>
          <li>5. Go back to Tasks — the task should now be marked "Done"</li>
        </ol>
      </div>
    </div>
  );
}
