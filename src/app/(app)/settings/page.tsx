import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function SettingsPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true, role: true, createdAt: true },
  });

  const membership = await db.workspaceMember.findFirst({
    where: { userId },
    include: { workspace: true },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>

      <div className="panel rounded-xl p-5 max-w-lg">
        <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--muted)" }}>
          Profile
        </h2>
        <div className="space-y-3">
          <div>
            <p className="text-xs" style={{ color: "var(--muted)" }}>Name</p>
            <p className="text-sm">{user?.name}</p>
          </div>
          <div>
            <p className="text-xs" style={{ color: "var(--muted)" }}>Email</p>
            <p className="text-sm">{user?.email}</p>
          </div>
          <div>
            <p className="text-xs" style={{ color: "var(--muted)" }}>Role</p>
            <p className="text-sm capitalize">{user?.role}</p>
          </div>
          <div>
            <p className="text-xs" style={{ color: "var(--muted)" }}>Joined</p>
            <p className="text-sm">{user?.createdAt.toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      {membership && (
        <div className="panel rounded-xl p-5 max-w-lg">
          <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--muted)" }}>
            Workspace
          </h2>
          <div className="space-y-3">
            <div>
              <p className="text-xs" style={{ color: "var(--muted)" }}>Name</p>
              <p className="text-sm">{membership.workspace.name}</p>
            </div>
            <div>
              <p className="text-xs" style={{ color: "var(--muted)" }}>Slug</p>
              <p className="text-sm">{membership.workspace.slug}</p>
            </div>
            <div>
              <p className="text-xs" style={{ color: "var(--muted)" }}>Your Role</p>
              <p className="text-sm capitalize">{membership.role}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
