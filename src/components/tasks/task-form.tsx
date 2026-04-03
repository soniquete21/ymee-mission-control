"use client";

import { useState, useEffect } from "react";

interface Project {
  id: string;
  name: string;
}

interface Agent {
  id: string;
  name: string;
}

export function TaskForm({
  onCreated,
  onCancel,
}: {
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);

  useEffect(() => {
    fetch("/api/projects").then((r) => r.json()).then(setProjects).catch(() => {});
    fetch("/api/agents").then((r) => r.json()).then(setAgents).catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const form = new FormData(e.currentTarget);
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.get("title"),
        description: form.get("description"),
        priority: form.get("priority"),
        status: form.get("status"),
        projectId: form.get("projectId") || null,
        agentId: form.get("agentId") || null,
      }),
    });

    setLoading(false);
    onCreated();
  }

  return (
    <div className="panel rounded-xl p-5">
      <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--muted)" }}>
        Create Task
      </h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          name="title"
          placeholder="Task title"
          required
          className="w-full px-3 py-2 rounded-lg text-sm"
          style={{
            background: "var(--panel-strong)",
            border: "1px solid var(--border)",
            color: "var(--text)",
          }}
        />

        <textarea
          name="description"
          placeholder="Description (optional)"
          rows={2}
          className="w-full px-3 py-2 rounded-lg text-sm resize-none"
          style={{
            background: "var(--panel-strong)",
            border: "1px solid var(--border)",
            color: "var(--text)",
          }}
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <select
            name="priority"
            defaultValue="medium"
            className="px-3 py-2 rounded-lg text-sm"
            style={{
              background: "var(--panel-strong)",
              border: "1px solid var(--border)",
              color: "var(--text)",
            }}
          >
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <select
            name="status"
            defaultValue="backlog"
            className="px-3 py-2 rounded-lg text-sm"
            style={{
              background: "var(--panel-strong)",
              border: "1px solid var(--border)",
              color: "var(--text)",
            }}
          >
            <option value="backlog">Backlog</option>
            <option value="in_progress">In Progress</option>
            <option value="review">Review</option>
            <option value="done">Done</option>
          </select>

          <select
            name="projectId"
            defaultValue=""
            className="px-3 py-2 rounded-lg text-sm"
            style={{
              background: "var(--panel-strong)",
              border: "1px solid var(--border)",
              color: "var(--text)",
            }}
          >
            <option value="">No Project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <select
            name="agentId"
            defaultValue=""
            className="px-3 py-2 rounded-lg text-sm"
            style={{
              background: "var(--panel-strong)",
              border: "1px solid var(--border)",
              color: "var(--text)",
            }}
          >
            <option value="">No Agent</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm"
            style={{ color: "var(--muted)" }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{
              background: "var(--accent)",
              color: "#fff",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Creating..." : "Create Task"}
          </button>
        </div>
      </form>
    </div>
  );
}
