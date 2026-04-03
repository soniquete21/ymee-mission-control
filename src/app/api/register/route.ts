import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const { name, email, password } = await req.json();

  if (!name || !email || !password) {
    return NextResponse.json({ error: "All fields required" }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }

  const passwordHash = await hash(password, 10);

  const user = await db.user.create({
    data: { name, email, passwordHash },
  });

  // Auto-join default workspace
  const workspace = await db.workspace.findUnique({ where: { slug: "hq" } });
  if (workspace) {
    await db.workspaceMember.create({
      data: { userId: user.id, workspaceId: workspace.id, role: "member" },
    });
  }

  return NextResponse.json({ ok: true, userId: user.id });
}
