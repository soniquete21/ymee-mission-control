import Link from "next/link";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

const typeColors: Record<string, { bg: string; text: string }> = {
  coordinator: { bg: "rgba(124, 140, 255, 0.15)", text: "var(--accent)" },
  specialist: { bg: "rgba(45, 212, 191, 0.15)", text: "var(--success)" },
  audit: { bg: "rgba(255, 193, 7, 0.15)", text: "var(--warning)" },
};

const priorityBadge: Record<string, { bg: string; text: string; label: string }> = {
  critical: { bg: "rgba(251, 113, 133, 0.15)", text: "var(--danger)", label: "Critical Priority" },
  high: { bg: "rgba(255, 193, 7, 0.15)", text: "var(--warning)", label: "High Priority" },
  normal: { bg: "rgba(255,255,255,0.06)", text: "var(--muted)", label: "" },
};

export default async function AgentsPage() {
  const session = await auth();
  const userId = session!.user!.id!;
  const userRole = session!.user!.role || "member";
  const admin = userRole === "admin";

  const membership = await db.workspaceMember.findFirst({
    where: { userId },
    select: { workspaceId: true },
  });

  if (!membership) return <p style={{ color: "var(--muted)" }}>No workspace.</p>;

  const agents = await db.agent.findMany({
    where: {
      workspaceId: membership.workspaceId,
      ...(!admin && { visibility: "all" }),
    },
    include: {
      _count: { select: { tasks: true, messages: true, runs: true } },
    },
    orderBy: [{ type: "asc" }, { priority: "asc" }, { name: "asc" }],
  });

  // Group by type
  const coordinator = agents.filter((a) => a.type === "coordinator");
  const specialists = agents.filter((a) => a.type === "specialist");
  const auditAgents = agents.filter((a) => a.type === "audit");

  function AgentCard({ agent }: { agent: typeof agents[0] }) {
    const tc = typeColors[agent.type] || typeColors.specialist;
    const pb = priorityBadge[agent.priority] || priorityBadge.normal;
    const skills: string[] = agent.skills ? JSON.parse(agent.skills) : [];

    return (
      <Link key={agent.id} href={`/agents/${agent.id}` as never}>
        <div className="panel rounded-xl p-5 hover:border-white/15 transition-colors cursor-pointer h-full flex flex-col">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-semibold">{agent.name}</h3>
                {pb.label && (
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0"
                    style={{ background: pb.bg, color: pb.text }}
                  >
                    {pb.label}
                  </span>
                )}
              </div>
              <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
                {agent.role}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wider"
                style={{ background: tc.bg, color: tc.text }}
              >
                {agent.type}
              </span>
              <span
                className="text-[10px] px-2 py-0.5 rounded-full"
                style={{
                  background: agent.isActive
                    ? "rgba(45, 212, 191, 0.15)"
                    : "rgba(251, 113, 133, 0.15)",
                  color: agent.isActive ? "var(--success)" : "var(--danger)",
                }}
              >
                {agent.isActive ? "Active" : "Inactive"}
              </span>
            </div>
          </div>

          {agent.description && (
            <p className="text-xs mt-3 line-clamp-2" style={{ color: "var(--muted)" }}>
              {agent.description}
            </p>
          )}

          {skills.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {skills.slice(0, 4).map((skill) => (
                <span
                  key={skill}
                  className="text-[10px] px-1.5 py-0.5 rounded"
                  style={{ background: "rgba(255,255,255,0.06)", color: "var(--muted)" }}
                >
                  {skill}
                </span>
              ))}
              {skills.length > 4 && (
                <span className="text-[10px] px-1.5 py-0.5" style={{ color: "var(--muted)" }}>
                  +{skills.length - 4} more
                </span>
              )}
            </div>
          )}

          <div className="flex items-center gap-4 mt-auto pt-4">
            <div>
              <p className="text-[10px]" style={{ color: "var(--muted)" }}>Tasks</p>
              <p className="text-lg font-bold" style={{ color: "var(--accent)" }}>
                {agent._count.tasks}
              </p>
            </div>
            <div>
              <p className="text-[10px]" style={{ color: "var(--muted)" }}>Messages</p>
              <p className="text-lg font-bold" style={{ color: "var(--accent-2)" }}>
                {agent._count.messages}
              </p>
            </div>
            <div>
              <p className="text-[10px]" style={{ color: "var(--muted)" }}>Runs</p>
              <p className="text-lg font-bold" style={{ color: "var(--accent)" }}>
                {agent._count.runs}
              </p>
            </div>
            {agent.visibility === "admin" && (
              <div className="ml-auto">
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded"
                  style={{ background: "rgba(251, 113, 133, 0.1)", color: "var(--danger)" }}
                >
                  Admin Only
                </span>
              </div>
            )}
          </div>
        </div>
      </Link>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Agent System</h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          {agents.length} agents &middot; Multi-agent operating system
        </p>
      </div>

      {/* Coordinator */}
      {coordinator.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--accent)" }}>
            Coordinator
          </h2>
          <div className="grid grid-cols-1 gap-4">
            {coordinator.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        </section>
      )}

      {/* Specialists */}
      {specialists.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--success)" }}>
            Specialist Agents
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {specialists.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        </section>
      )}

      {/* Audit */}
      {auditAgents.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--warning)" }}>
            Audit & Review
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {auditAgents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
