import { NextResponse } from "next/server";
import { auth } from "./auth";
import { db } from "./db";

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    name: session.user.name || "User",
    email: session.user.email || "",
    role: session.user.role || "member",
  };
}

export async function getWorkspaceId(userId: string) {
  const membership = await db.workspaceMember.findFirst({
    where: { userId },
    select: { workspaceId: true },
  });
  return membership?.workspaceId ?? null;
}

export function isAdmin(user: AuthenticatedUser): boolean {
  return user.role === "admin";
}

export function apiError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}
