"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Bot,
  User,
} from "lucide-react";

interface ApprovalTask {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  progressNote: string | null;
  updatedAt: string;
  creator: { id: string; name: string } | null;
  assignee: { id: string; name: string } | null;
  agent: { id: string; name: string } | null;
  project: { id: string; name: string } | null;
}

interface ResolvedEvent {
  id: string;
  action: string;
  target: string;
  createdAt: string;
  actor: { id: string; name: string };
  task: { id: string; title: string; status: string } | null;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const priorityColors: Record<string, string> = {
  urgent: "var(--danger)",
  high: "#f59e0b",
  medium: "var(--accent)",
  low: "var(--muted)",
};

export default function ApprovalsPage() {
  const { data, mutate } = useSWR<{
    pending: ApprovalTask[];
    resolved: ResolvedEvent[];
  }>("/api/approvals", fetcher, { refreshInterval: 5000 });

  const [acting, setActing] = useState<string | null>(null);
  const [comment, setComment] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  async function handleAction(taskId: string, action: "approve" | "reject") {
    setActing(taskId);
    setError(null);

    try {
      const res = await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId,
          action,
          comment: comment[taskId] || undefined,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        setError(result.error || "Action failed");
      } else {
        // Clear comment and refresh
        setComment((prev) => ({ ...prev, [taskId]: "" }));
        mutate();
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setActing(null);
    }
  }

  const pending = data?.pending || [];
  const resolved = data?.resolved || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Approvals</h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          Review and approve agent-submitted work
        </p>
      </div>

      {error && (
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs"
          style={{
            background: "rgba(251, 113, 133, 0.1)",
            color: "var(--danger)",
          }}
        >
          <AlertCircle size={14} />
          {error}
          <button onClick={() => setError(null)} className="ml-auto underline">
            dismiss
          </button>
        </div>
      )}

      {/* Pending approvals */}
      <div>
        <h2
          className="text-sm font-semibold mb-3 flex items-center gap-2"
          style={{ color: "var(--muted)" }}
        >
          <Clock size={14} />
          Pending Review ({pending.length})
        </h2>

        {pending.length === 0 ? (
          <div
            className="panel rounded-xl p-8 text-center"
            style={{ color: "var(--muted)" }}
          >
            <ShieldCheck size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">No pending approvals</p>
            <p className="text-xs mt-1">
              Tasks will appear here when agents request approval
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map((task) => (
              <div key={task.id} className="panel rounded-xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{
                          background:
                            priorityColors[task.priority] || "var(--muted)",
                        }}
                      />
                      <h3
                        className="font-medium text-sm truncate"
                        style={{ color: "var(--text)" }}
                      >
                        {task.title}
                      </h3>
                    </div>

                    {task.description && (
                      <p
                        className="text-xs mt-1 line-clamp-2"
                        style={{ color: "var(--muted)" }}
                      >
                        {task.description}
                      </p>
                    )}

                    {task.progressNote && (
                      <div
                        className="mt-2 px-3 py-2 rounded-lg text-xs"
                        style={{
                          background: "rgba(124, 140, 255, 0.06)",
                          color: "var(--text)",
                        }}
                      >
                        {task.progressNote}
                      </div>
                    )}

                    <div className="flex items-center gap-3 mt-2 text-[11px]">
                      {task.agent && (
                        <span
                          className="flex items-center gap-1"
                          style={{ color: "var(--accent)" }}
                        >
                          <Bot size={10} />
                          {task.agent.name}
                        </span>
                      )}
                      {task.assignee && (
                        <span
                          className="flex items-center gap-1"
                          style={{ color: "var(--muted)" }}
                        >
                          <User size={10} />
                          {task.assignee.name}
                        </span>
                      )}
                      {task.project && (
                        <span style={{ color: "var(--muted)" }}>
                          {task.project.name}
                        </span>
                      )}
                      <span style={{ color: "var(--muted)" }}>
                        {new Date(task.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Comment + actions */}
                <div className="mt-3 flex items-center gap-2">
                  <input
                    value={comment[task.id] || ""}
                    onChange={(e) =>
                      setComment((prev) => ({
                        ...prev,
                        [task.id]: e.target.value,
                      }))
                    }
                    placeholder="Add a comment (optional)..."
                    className="flex-1 px-3 py-2 rounded-lg text-xs outline-none"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid var(--border)",
                      color: "var(--text)",
                    }}
                  />
                  <button
                    onClick={() => handleAction(task.id, "approve")}
                    disabled={acting === task.id}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                    style={{
                      background: "rgba(52, 211, 153, 0.15)",
                      color: "var(--success)",
                    }}
                  >
                    <CheckCircle2 size={14} />
                    Approve
                  </button>
                  <button
                    onClick={() => handleAction(task.id, "reject")}
                    disabled={acting === task.id}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                    style={{
                      background: "rgba(251, 113, 133, 0.15)",
                      color: "var(--danger)",
                    }}
                  >
                    <XCircle size={14} />
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resolved history */}
      {resolved.length > 0 && (
        <div>
          <h2
            className="text-sm font-semibold mb-3 flex items-center gap-2"
            style={{ color: "var(--muted)" }}
          >
            <CheckCircle2 size={14} />
            Recent Decisions
          </h2>
          <div className="panel rounded-xl divide-y" style={{ borderColor: "var(--border)" }}>
            {resolved.map((event) => (
              <div
                key={event.id}
                className="px-4 py-3 flex items-center gap-3 text-sm"
              >
                {event.action === "approved" ? (
                  <CheckCircle2
                    size={14}
                    style={{ color: "var(--success)" }}
                  />
                ) : (
                  <XCircle size={14} style={{ color: "var(--danger)" }} />
                )}
                <span style={{ color: "var(--accent)" }}>
                  {event.actor.name}
                </span>
                <span style={{ color: "var(--muted)" }}>{event.action}</span>
                <span
                  className="flex-1 truncate"
                  style={{ color: "var(--text)" }}
                >
                  {event.task?.title || event.target}
                </span>
                <span
                  className="text-xs flex-shrink-0"
                  style={{ color: "var(--muted)" }}
                >
                  {new Date(event.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
