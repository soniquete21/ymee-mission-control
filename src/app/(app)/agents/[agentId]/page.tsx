"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import useSWR from "swr";

interface Agent {
  id: string;
  name: string;
  slug: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

interface AgentRun {
  id: string;
  status: string;
  result: string | null;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  task: {
    id: string;
    title: string;
  };
  outputs: {
    id: string;
    kind: string;
    content: string;
    order: number;
  }[];
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{agent.name}</h1>
        <p style={{ color: "var(--muted)" }} className="text-sm mt-1">
          {agent.role}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Agent Info */}
        <div className="panel rounded-xl p-5">
          <h2 className="text-sm font-semibold mb-4">Agent Info</h2>
          <div className="space-y-3">
            <div>
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                Status
              </p>
              <div className="mt-1 flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{
                    background: agent.isActive ? "var(--success)" : "var(--danger)",
                  }}
                />
                <span className="text-sm">{agent.isActive ? "Active" : "Inactive"}</span>
              </div>
            </div>
            <div>
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                Created
              </p>
              <p className="text-sm mt-1">
                {new Date(agent.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                Slug
              </p>
              <p className="text-sm mt-1 font-mono">{agent.slug}</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="panel rounded-xl p-5">
          <h2 className="text-sm font-semibold mb-4">Execution Stats</h2>
          <div className="space-y-3">
            <div>
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                Total Runs
              </p>
              <p className="text-2xl font-bold mt-1" style={{ color: "var(--accent)" }}>
                {runs?.length || 0}
              </p>
            </div>
            <div>
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                Success Rate
              </p>
              <p className="text-lg font-semibold mt-1">
                {runs && runs.length > 0
                  ? Math.round(
                      (runs.filter((r) => r.status === "completed").length /
                        runs.length) *
                        100
                    )
                  : 0}
                %
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Agent Runs */}
      <div className="panel rounded-xl p-5">
        <h2 className="text-sm font-semibold mb-4">Recent Runs</h2>

        {!runs || runs.length === 0 ? (
          <p style={{ color: "var(--muted)" }} className="text-sm">
            No runs yet
          </p>
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
                    <p
                      className="text-xs mt-1 font-mono"
                      style={{ color: "var(--muted)" }}
                    >
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
                  <p className="text-sm mt-2" style={{ color: "var(--muted)" }}>
                    {run.result}
                  </p>
                )}

                {run.outputs && run.outputs.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {run.outputs.map((output) => (
                      <div
                        key={output.id}
                        className="bg-black/20 rounded p-2"
                      >
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
