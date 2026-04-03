import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user!.id!;
  const userRole = session!.user!.role || "member";
  const admin = userRole === "admin";

  const membership = await db.workspaceMember.findFirst({
    where: { userId },
    include: { workspace: true },
  });

  if (!membership) {
    return <p style={{ color: "var(--muted)" }}>No workspace found.</p>;
  }

  const workspaceId = membership.workspaceId;

  const [taskCount, inProgressCount, doneCount, projectCount, agents] =
    await Promise.all([
      db.task.count({ where: { workspaceId } }),
      db.task.count({ where: { workspaceId, status: "in_progress" } }),
      db.task.count({ where: { workspaceId, status: "done" } }),
      db.project.count({ where: { workspaceId } }),
      db.agent.findMany({
        where: {
          workspaceId,
          isActive: true,
          ...(!admin && { visibility: "all" }),
        },
        include: { _count: { select: { tasks: true } } },
        orderBy: [{ type: "asc" }, { priority: "asc" }],
      }),
    ]);

  const completionRate = taskCount > 0 ? Math.round((doneCount / taskCount) * 100) : 0;

  const recentActivity = await db.activityEvent.findMany({
    where: { task: { workspaceId } },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { actor: { select: { name: true } } },
  });

  const stats = [
    { label: "Total Tasks", value: taskCount, color: "var(--accent)" },
    { label: "In Progress", value: inProgressCount, color: "var(--accent-2)" },
    { label: "Completion", value: `${completionRate}%`, color: "var(--success)" },
    { label: "Projects", value: projectCount, color: "var(--warning)" },
    { label: "Active Agents", value: agents.length, color: "var(--accent)" },
  ];

  const typeColor: Record<string, string> = {
    coordinator: "var(--accent)",
    specialist: "var(--success)",
    audit: "var(--warning)",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          {membership.workspace.name}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="panel rounded-xl p-4 metric-glow">
            <p className="text-xs font-medium" style={{ color: "var(--muted)" }}>{s.label}</p>
            <p className="text-2xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Agent Overview */}
      <div className="panel rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold" style={{ color: "var(--muted)" }}>Agent System</h2>
          <Link href="/agents" className="text-xs" style={{ color: "var(--accent)" }}>
            View All
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {agents.map((agent) => (
            <Link key={agent.id} href={`/agents/${agent.id}` as never}>
              <div
                className="rounded-lg p-3 hover:bg-white/5 transition-colors cursor-pointer text-center"
                style={{ border: "1px solid var(--border)" }}
              >
                <div
                  className="w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center text-xs font-bold"
                  style={{
                    background: `color-mix(in srgb, ${typeColor[agent.type] || "var(--muted)"} 15%, transparent)`,
                    color: typeColor[agent.type] || "var(--muted)",
                  }}
                >
                  {agent.name.charAt(0)}
                </div>
                <p className="text-xs font-medium truncate">{agent.name}</p>
                <p className="text-[10px] mt-0.5" style={{ color: "var(--muted)" }}>
                  {agent._count.tasks} tasks
                </p>
                {agent.visibility === "admin" && (
                  <span className="text-[9px]" style={{ color: "var(--danger)" }}>Admin</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="panel rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold" style={{ color: "var(--muted)" }}>Quick Actions</h2>
          </div>
          <div className="space-y-2">
            <Link
              href="/tasks"
              className="block px-4 py-3 rounded-lg text-sm transition-colors hover:bg-white/5"
              style={{ border: "1px solid var(--border)" }}
            >
              View Task Board
            </Link>
            <Link
              href="/agents"
              className="block px-4 py-3 rounded-lg text-sm transition-colors hover:bg-white/5"
              style={{ border: "1px solid var(--border)" }}
            >
              Agent System
            </Link>
            <Link
              href="/projects"
              className="block px-4 py-3 rounded-lg text-sm transition-colors hover:bg-white/5"
              style={{ border: "1px solid var(--border)" }}
            >
              View Projects
            </Link>
          </div>
        </div>

        <div className="panel rounded-xl p-5">
          <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--muted)" }}>Recent Activity</h2>
          {recentActivity.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              No activity yet. Create a task to get started.
            </p>
          ) : (
            <div className="space-y-2">
              {recentActivity.map((event) => (
                <div key={event.id} className="flex items-start gap-2 text-sm py-1">
                  <span className="font-medium" style={{ color: "var(--accent)" }}>
                    {event.actor.name}
                  </span>
                  <span style={{ color: "var(--muted)" }}>{event.action}</span>
                  <span style={{ color: "var(--text)" }}>{event.target}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
