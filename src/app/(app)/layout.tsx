import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { SessionProvider } from "next-auth/react";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <SessionProvider session={session}>
      <div className="flex min-h-screen">
        <Sidebar userName={session.user.name || "User"} userRole={session.user.role || "member"} />
        <main className="flex-1 ml-60">
          <div className="p-6">{children}</div>
        </main>
      </div>
    </SessionProvider>
  );
}
