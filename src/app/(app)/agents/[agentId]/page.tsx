"use client";

import { useParams } from "next/navigation";
import useSWR from "swr";
import Link from "next/link";

interface AgentTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  workflowState: string;
  updatedAt: string;
}

interface Agent {
  id: string;
  name: string;
  slug: string;
  role: string;
  description: string | null;
  type: string;
  priority: string;
  skills: string | null;
  capabilities: string | null;
  visibility: string;
  isActive: boolean;
  createdAt: string;
  _count: { tasks: number; messages: number; runs: number };
  tasks: AgentTask[];
}

interface AgentRun {
  id: string;
  status: string;
  result: string | null;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  task: { id: string; title: string };
  outputs: { id: string; kind: string; content: string; order: number }[];
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const priorityColor: Record<string, string> = {
  critical: "var(--danger)",
  high: "var(--warning)",
  medium: "var(--accent)",
  low: "var(--muted)",
};

const statusColor: Record<string, string> = {
  backlog: "var(--muted)",
  in_progress: "var(--accent-2)",
  review: "var(--warning)",
  done: "var(--success)",
};

const workflowLabels: Record<string, string> = {
  unassigned: "Unassigned",
  assigned: "Assigned",
  accepted: "Accepted",
  in_work: "In Work",
  ready_for_review: "Ready for Review",
  approved: "Approved",
  completed: "Completed",
};

export default function AgentDetailPage() {
  const params = useParams();
  const agentId = params.agentId as string;

  const { data: agent } = useSWR<Agent>(
    agentId ? `/api/agents/${agentId}` : null,
    fetcher
  );

  const { data: runs } = useSWR<AgentRun[]>(
    agentId ? `/api/agents/${agentId}/runs` : null,
    fetcher
  );

  if (!agent) {
    return (
      <div className="space-y-6">
        <p style={{ color: "var(--muted)" }}>Loading agent...</p>
      </div>
    );
  }

  const skills: string[] = agent.skills ? JSON.parse(agent.skills) : [];
  const capabilities = agent.capabilities ? JSON.parse(agent.capabilities) : null;

  const typeColors: Record<string, string> = {
    coordinator: "var(--accent)",
    specialist: "var(--success)",
    audit: "var(--warning)",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{agent.name}</h1>
            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wider"
              style={{
                background: `color-mix(in srgb, ${typeColors[agent.type] || "var(--muted)"} 15%, transparent)`,
                color: typeColors[agent.type] || "var(--muted)",
              }}
            >
              {agent.type}
            </span>
            {agent.priority !== "normal" && (
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                style={{
                  background: agent.priority === "critical" ? "rgba(251,113,133,0.15)" : "rgba(255,193,7,0.15)",
                  color: agent.priority === "critical" ? "var(--danger)" : "var(--warning)",
                }}
              >
                {agent.priority} priority
              </span>
            )}
          </div>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            {agent.role}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {agent.visibility === "admin" && (
            <span
              className="text-[10px] px-2 py-0.5 rounded-full"
              style={{ background: "rgba(251,113,133,0.1)", color: "var(--danger)" }}
            >
              Admin Only
            </span>
          )}
          <div
            className="flex items-center gap-1.5 px-2 py-1 rounded-full"
            style={{
              background: agent.isActive ? "rgba(45,212,191,0.15)" : "rgba(251,113,133,0.15)",
            }}
          >
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: agent.isActive ? "var(--success)" : "var(--danger)" }}
            />
            <span
              className="text-xs"
              style={{ color: agent.isActive ? "var(--success)" : "var(--danger)" }}
            >
              {agent.isActive ? "Active" : "Inactive"}
            </span>
          </div>
        </div>
      </div>

      {/* Description */}
      {agent.description && (
        <div className="panel rounded-xl p-5">
          <p className="text-sm leading-relaxed" style={{ color: "var(--text)" }}>
            {agent.description}
          </p>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
        <div className="panel rounded-xl p-4">
          <p className="text-[10px] font-medium" style={{ color: "var(--muted)" }}>Assigned Tasks</p>
          <p className="text-2xl font-bold mt-1" style={{ color: "var(--accent)" }}>
            {agent._count.tasks}
          </p>
        </div>
        <div className="panel rounded-xl p-4">
          <p className="text-[10px] font-medium" style={{ color: "var(--muted)" }}>Messages</p>
          <p className="text-2xl font-bold mt-1" style={{ color: "var(--accent-2)" }}>
            {agent._count.messages}
          </p>
        </div>
        <div className="panel rounded-xl p-4">
          <p className="text-[10px] font-medium" style={{ color: "var(--muted)" }}>Runs</p>
          <p className="text-2xl font-bold mt-1" style={{ color: "var(--accent)" }}>
            {agent._count.runs}
          </p>
        </div>
        <div className="panel rounded-xl p-4">
          <p className="text-[10px] font-medium" style={{ color: "var(--muted)" }}>Success Rate</p>
          <p className="text-2xl font-bold mt-1" style={{ color: "var(--success)" }}>
            {runs && runs.length > 0
              ? Math.round((runs.filter((r) => r.status === "completed").length / runs.length) * 100)
              : 0}%
          </p>
        </div>
        <div className="panel rounded-xl p-4">
          <p className="text-[10px] font-medium" style={{ color: "var(--muted)" }}>Skills</p>
          <p className="text-2xl font-bold mt-1" style={{ color: "var(--warning)" }}>
            {skills.length}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Skills */}
        <div className="panel rounded-xl p-5">
          <h2 className="text-sm font-semibold mb-4">Skills & Capabilities</h2>
          {skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {skills.map((skill) => (
                <span
                  key={skill}
                  className="text-xs px-2 py-1 rounded-lg"
                  style={{ background: "rgba(255,255,255,0.06)", color: "var(--text)" }}
                >
                  {skill}
                </span>
              ))}
            </div>
          )}
          {capabilities && (
            <div className="space-y-3 mt-4">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                  Domain
                </p>
                <p className="text-sm mt-1">{capabilities.domain}</p>
              </div>
              {capabilities.strengths && (
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                    Strengths
                  </p>
                  <ul className="mt-1 space-y-1">
                    {capabilities.strengths.map((s: string) => (
                      <li key={s} className="text-xs flex items-start gap-2">
                        <span style={{ color: "var(--success)" }}>+</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {capabilities.focus && (
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                    Focus
                  </p>
                  <p className="text-xs mt-1" style={{ color: "var(--accent)" }}>
                    {capabilities.focus}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Assigned Tasks */}
        <div className="panel rounded-xl p-5">
          <h2 className="text-sm font-semibold mb-4">Assigned Tasks</h2>
          {(!agent.tasks || agent.tasks.length === 0) ? (
            <p className="text-sm" style={{ color: "var(--muted)" }}>No tasks assigned</p>
          ) : (
            <div className="space-y-2">
              {agent.tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-3 rounded-lg"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{task.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded"
                        style={{ color: statusColor[task.status] || "var(--muted)" }}
                      >
                        {task.status.replace("_", " ")}
                      </span>
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded"
                        style={{ color: priorityColor[task.priority] || "var(--muted)" }}
                      >
                        {task.priority}
                      </span>
                      <span className="text-[10px]" style={{ color: "var(--muted)" }}>
                        {workflowLabels[task.workflowState] || task.workflowState}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Runs */}
      <div className="panel rounded-xl p-5">
        <h2 className="text-sm font-semibold mb-4">Recent Runs</h2>
        {!runs || runs.length === 0 ? (
          <p style={{ color: "var(--muted)" }} className="text-sm">No runs yet</p>
        ) : (
          <div className="space-y-3">
            {runs.map((run) => (
              <div
                key={run.id}
                className="border rounded-lg p-3"
                style={{ borderColor: "var(--border)" }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-sm font-medium">{run.task.title}</h3>
                    <p className="text-xs mt-1 font-mono" style={{ color: "var(--muted)" }}>
                      {run.id}
                    </p>
                  </div>
                  <span
                    className="text-xs px-2 py-1 rounded-full"
                    style={{
                      background:
                        run.status === "completed"
                          ? "rgba(45, 212, 191, 0.15)"
                          : run.status === "failed"
                          ? "rgba(251, 113, 133, 0.15)"
                          : "rgba(255, 193, 7, 0.15)",
                      color:
                        run.status === "completed"
                          ? "var(--success)"
                          : run.status === "failed"
                          ? "var(--danger)"
                          : "var(--warning)",
                    }}
                  >
                    {run.status}
                  </span>
                </div>
                {run.result && (
                  <p className="text-sm mt-2" style={{ color: "var(--muted)" }}>{run.result}</p>
                )}
                {run.outputs && run.outputs.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {run.outputs.map((output) => (
                      <div key={output.id} className="bg-black/20 rounded p-2">
                        <p className="text-xs font-mono" style={{ color: "var(--accent)" }}>
                          {output.kind}
                        </p>
                        <p className="text-xs mt-1 line-clamp-3">
                          {output.content.substring(0, 200)}...
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>
                  {new Date(run.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
