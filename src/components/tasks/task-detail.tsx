"use client";

import { useState } from "react";
import { X, Trash2, Zap, CheckCircle, AlertCircle } from "lucide-react";

interface TaskDetailProps {
  task: {
    id: string;
    title: string;
    description: string | null;
    status: string;
    priority: string;
    blocked: boolean;
    progressNote: string | null;
    workflowState?: string;
    routingReason?: string | null;
    needsAudit?: boolean;
    createdAt: string;
    project: { name: string } | null;
    creator: { name: string };
    agent: { name: string; id: string; type?: string; slug?: string } | null;
  };
  onClose: () => void;
  onUpdated: () => void;
}

const workflowStates = [
  { value: "unassigned", label: "Unassigned" },
  { value: "assigned", label: "Assigned" },
  { value: "accepted", label: "Accepted" },
  { value: "in_work", label: "In Work" },
  { value: "ready_for_review", label: "Ready for Review" },
  { value: "approved", label: "Approved" },
  { value: "completed", label: "Completed" },
];

const workflowColor: Record<string, string> = {
  unassigned: "var(--muted)",
  assigned: "var(--accent)",
  accepted: "var(--accent-2)",
  in_work: "var(--accent-2)",
  ready_for_review: "var(--warning)",
  approved: "var(--success)",
  completed: "var(--success)",
};

export function TaskDetail({ task, onClose, onUpdated }: TaskDetailProps) {
  const [progressNote, setProgressNote] = useState(task.progressNote || "");
  const [saving, setSaving] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [execResult, setExecResult] = useState<{
    ok: boolean;
    text?: string;
    error?: string;
    durationMs?: number;
    model?: string;
  } | null>(null);

  async function updateField(data: Record<string, unknown>) {
    setSaving(true);
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setSaving(false);
    onUpdated();
  }

  async function executeWithOpenClaw() {
    if (!task.agent?.id) {
      alert("This task has no assigned agent");
      return;
    }

    setExecuting(true);
    setExecResult(null);
    try {
      const response = await fetch("/api/agents/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: task.id,
          agentId: task.agent.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setExecResult({ ok: false, error: data.error });
        return;
      }

      setExecResult({
        ok: data.ok,
        text: data.response?.text,
        durationMs: data.response?.durationMs,
        model: data.response?.model,
        error: data.ok ? undefined : data.message,
      });
      onUpdated();
    } catch (error) {
      setExecResult({ ok: false, error: String(error) });
    } finally {
      setExecuting(false);
    }
  }

  async function deleteTask() {
    if (!confirm("Delete this task?")) return;
    await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
    onUpdated();
  }

  const wfState = task.workflowState || "unassigned";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className="relative w-full max-w-md h-full overflow-y-auto panel-strong"
        style={{ borderLeft: "1px solid var(--border)" }}
      >
        <div className="p-5">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold">{task.title}</h2>
            <button onClick={onClose} className="p-1 hover:bg-white/5 rounded">
              <X size={18} style={{ color: "var(--muted)" }} />
            </button>
          </div>

          <div className="space-y-4">
            {/* Workflow State */}
            <div>
              <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>
                Workflow State
              </label>
              <select
                value={wfState}
                onChange={(e) => updateField({ workflowState: e.target.value })}
                className="w-full mt-1 px-3 py-2 rounded-lg text-sm"
                style={{
                  background: "var(--panel)",
                  border: "1px solid var(--border)",
                  color: workflowColor[wfState] || "var(--text)",
                }}
              >
                {workflowStates.map((ws) => (
                  <option key={ws.value} value={ws.value}>{ws.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>
                Status
              </label>
              <select
                value={task.status}
                onChange={(e) => updateField({ status: e.target.value })}
                className="w-full mt-1 px-3 py-2 rounded-lg text-sm"
                style={{
                  background: "var(--panel)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                }}
              >
                <option value="backlog">Backlog</option>
                <option value="in_progress">In Progress</option>
                <option value="review">Review</option>
                <option value="done">Done</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>
                Priority
              </label>
              <select
                value={task.priority}
                onChange={(e) => updateField({ priority: e.target.value })}
                className="w-full mt-1 px-3 py-2 rounded-lg text-sm"
                style={{
                  background: "var(--panel)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                }}
              >
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            {task.description && (
              <div>
                <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>
                  Description
                </label>
                <p className="text-sm mt-1">{task.description}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>
                  Project
                </label>
                <p className="text-sm mt-1">{task.project?.name || "None"}</p>
              </div>
              <div>
                <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>
                  Agent
                </label>
                <div className="mt-1">
                  <p className="text-sm">{task.agent?.name || "None"}</p>
                  {task.agent?.type && (
                    <span className="text-[10px]" style={{ color: "var(--muted)" }}>
                      {task.agent.type}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {task.routingReason && (
              <div>
                <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>
                  Routing Reason
                </label>
                <p className="text-xs mt-1" style={{ color: "var(--accent)" }}>
                  {task.routingReason}
                </p>
              </div>
            )}

            <div>
              <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>
                Creator
              </label>
              <p className="text-sm mt-1">{task.creator.name}</p>
            </div>

            {/* Needs Audit toggle */}
            <div>
              <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>
                Audit Review
              </label>
              <button
                onClick={() => updateField({ needsAudit: !task.needsAudit })}
                className="block mt-1 px-3 py-1.5 rounded-lg text-sm"
                style={{
                  background: task.needsAudit
                    ? "rgba(255, 193, 7, 0.15)"
                    : "rgba(255,255,255,0.05)",
                  color: task.needsAudit ? "var(--warning)" : "var(--muted)",
                  border: "1px solid var(--border)",
                }}
              >
                {task.needsAudit ? "Audit Required" : "No Audit — Click to flag"}
              </button>
            </div>

            <div>
              <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>
                Blocked
              </label>
              <button
                onClick={() => updateField({ blocked: !task.blocked })}
                className="block mt-1 px-3 py-1.5 rounded-lg text-sm"
                style={{
                  background: task.blocked
                    ? "rgba(251, 113, 133, 0.15)"
                    : "rgba(124, 140, 255, 0.1)",
                  color: task.blocked ? "var(--danger)" : "var(--accent)",
                  border: "1px solid var(--border)",
                }}
              >
                {task.blocked ? "Blocked — Click to unblock" : "Not blocked"}
              </button>
            </div>

            <div>
              <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>
                Progress Note
              </label>
              <textarea
                value={progressNote}
                onChange={(e) => setProgressNote(e.target.value)}
                rows={3}
                className="w-full mt-1 px-3 py-2 rounded-lg text-sm resize-none"
                style={{
                  background: "var(--panel)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                }}
              />
              <button
                onClick={() => updateField({ progressNote })}
                disabled={saving}
                className="mt-2 px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{
                  background: "var(--accent)",
                  color: "#fff",
                  opacity: saving ? 0.6 : 1,
                }}
              >
                Save Note
              </button>
            </div>

            <div className="pt-4 border-t" style={{ borderColor: "var(--border)" }}>
              {task.agent?.id && (
                <button
                  onClick={executeWithOpenClaw}
                  disabled={executing}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-2"
                  style={{
                    background: "rgba(45, 212, 191, 0.15)",
                    color: "var(--success)",
                    opacity: executing ? 0.6 : 1,
                  }}
                >
                  <Zap size={14} />
                  {executing ? "Executing via OpenClaw..." : "Execute with OpenClaw"}
                </button>
              )}

              {/* Execution result */}
              {execResult && (
                <div
                  className="mb-2 p-3 rounded-lg text-xs"
                  style={{
                    background: execResult.ok
                      ? "rgba(45, 212, 191, 0.08)"
                      : "rgba(251, 113, 133, 0.08)",
                    border: `1px solid ${execResult.ok ? "var(--success)" : "var(--danger)"}`,
                  }}
                >
                  <div className="flex items-center gap-1.5 mb-1 font-medium" style={{
                    color: execResult.ok ? "var(--success)" : "var(--danger)",
                  }}>
                    {execResult.ok ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                    {execResult.ok ? "Execution Complete" : "Execution Failed"}
                    {execResult.durationMs && (
                      <span className="ml-auto opacity-60">{(execResult.durationMs / 1000).toFixed(1)}s</span>
                    )}
                  </div>
                  {execResult.model && (
                    <div className="text-[10px] opacity-50 mb-1">Model: {execResult.model}</div>
                  )}
                  <div className="whitespace-pre-wrap mt-1" style={{ color: "var(--text)" }}>
                    {execResult.text?.substring(0, 500) || execResult.error}
                  </div>
                </div>
              )}
              <button
                onClick={deleteTask}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-white/5"
                style={{ color: "var(--danger)" }}
              >
                <Trash2 size={14} />
                Delete Task
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
