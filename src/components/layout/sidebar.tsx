"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  CheckSquare,
  FolderOpen,
  Bot,
  MessageSquare,
  ShieldCheck,
  Settings,
  LogOut,
} from "lucide-react";

const nav = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Tasks", href: "/tasks", icon: CheckSquare },
  { label: "Projects", href: "/projects", icon: FolderOpen },
  { label: "Agents", href: "/agents", icon: Bot },
  { label: "Chat", href: "/chat", icon: MessageSquare },
  { label: "Approvals", href: "/approvals", icon: ShieldCheck },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar({ userName, userRole }: { userName: string; userRole: string }) {
  const pathname = usePathname();
  const isAdmin = userRole === "admin";

  return (
    <aside
      className="fixed left-0 top-0 bottom-0 w-60 flex flex-col panel-strong z-50"
      style={{ borderRight: "1px solid var(--border)" }}
    >
      <div className="p-5 border-b" style={{ borderColor: "var(--border)" }}>
        <h1 className="text-lg font-bold tracking-tight" style={{ color: "var(--accent)" }}>
          Mission Control
        </h1>
        <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
          Multi-Agent OS
        </p>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {nav.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href as never}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors"
              style={{
                background: active ? "rgba(124, 140, 255, 0.12)" : "transparent",
                color: active ? "var(--accent)" : "var(--muted)",
              }}
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div
        className="p-4 border-t"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--text)" }}>
              {userName}
            </p>
            <p className="text-xs" style={{ color: isAdmin ? "var(--accent)" : "var(--muted)" }}>
              {isAdmin ? "Admin" : "Team Member"}
            </p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="p-2 rounded-lg transition-colors hover:bg-white/5"
            title="Sign out"
          >
            <LogOut size={16} style={{ color: "var(--muted)" }} />
          </button>
        </div>
      </div>
    </aside>
  );
}
