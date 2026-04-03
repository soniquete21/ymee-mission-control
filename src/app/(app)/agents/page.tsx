import Link from "next/link";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export default async function AgentsPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const membership = await db.workspaceMember.findFirst({
    where: { userId },
    select: { workspaceId: true },
  });

  if (!membership) return <p style={{ color: "var(--muted)" }}>No workspace.</p>;

  const agents = await db.agent.findMany({
    where: { workspaceId: membership.workspaceId },
    include: {
      _count: { select: { tasks: true, messages: true, runs: true } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Agents</h1>
      <p className="text-sm" style={{ color: "var(--muted)" }}>
        {agents.length} agents configured
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((agent) => (
          <Link key={agent.id} href={`/agents/${agent.id}` as never}>
            <div className="panel rounded-xl p-5 hover:border-white/15 transition-colors cursor-pointer h-full">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-semibold">{agent.name}</h3>
                  <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
                    {agent.role}
                  </p>
                </div>
                <span
                  className="text-xs px-2 py-1 rounded-full"
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
              <div className="flex items-center gap-4 mt-4">
                <div>
                  <p className="text-xs" style={{ color: "var(--muted)" }}>Assigned Tasks</p>
                  <p className="text-lg font-bold" style={{ color: "var(--accent)" }}>
                    {agent._count.tasks}
                  </p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: "var(--muted)" }}>Messages</p>
                  <p className="text-lg font-bold" style={{ color: "var(--accent-2)" }}>
                    {agent._count.messages}
                  </p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: "var(--muted)" }}>Runs</p>
                  <p className="text-lg font-bold" style={{ color: "var(--accent)" }}>
                    {agent._count.runs}
                  </p>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
