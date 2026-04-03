import { NextResponse } from "next/server";
import { auth } from "./auth";
import { db } from "./db";

export async function getAuthenticatedUser(): Promise<{ id: string; name: string; email: string } | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    name: session.user.name || "User",
    email: session.user.email || "",
  };
}

export async function getWorkspaceId(userId: string) {
  const membership = await db.workspaceMember.findFirst({
    where: { userId },
    select: { workspaceId: true },
  });
  return membership?.workspaceId ?? null;
}

export function apiError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}
