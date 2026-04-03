import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export default async function ProjectsPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const membership = await db.workspaceMember.findFirst({
    where: { userId },
    select: { workspaceId: true },
  });

  if (!membership) return <p style={{ color: "var(--muted)" }}>No workspace.</p>;

  const projects = await db.project.findMany({
    where: { workspaceId: membership.workspaceId },
    include: {
      _count: { select: { tasks: true } },
      tasks: {
        select: { status: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Projects</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((project) => {
          const done = project.tasks.filter((t) => t.status === "done").length;
          const total = project._count.tasks;
          const progress = total > 0 ? Math.round((done / total) * 100) : 0;

          return (
            <div key={project.id} className="panel rounded-xl p-5">
              <h3 className="text-base font-semibold">{project.name}</h3>
              {project.description && (
                <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
                  {project.description}
                </p>
              )}
              <div className="flex items-center gap-4 mt-4">
                <div>
                  <p className="text-xs" style={{ color: "var(--muted)" }}>Tasks</p>
                  <p className="text-lg font-bold" style={{ color: "var(--accent)" }}>
                    {total}
                  </p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: "var(--muted)" }}>Done</p>
                  <p className="text-lg font-bold" style={{ color: "var(--success)" }}>
                    {done}
                  </p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: "var(--muted)" }}>Progress</p>
                  <p className="text-lg font-bold" style={{ color: "var(--accent-2)" }}>
                    {progress}%
                  </p>
                </div>
              </div>
              <div
                className="mt-3 h-1.5 rounded-full overflow-hidden"
                style={{ background: "var(--border)" }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${progress}%`,
                    background: "var(--accent)",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
