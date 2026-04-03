import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedUser, getWorkspaceId, apiError } from "@/lib/api-helpers";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return apiError("Unauthorized", 401);

  const workspaceId = await getWorkspaceId(user.id);
  if (!workspaceId) return apiError("No workspace", 403);

  const projects = await db.project.findMany({
    where: { workspaceId },
    include: {
      _count: { select: { tasks: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(projects);
}

export async function POST(req: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return apiError("Unauthorized", 401);

  const workspaceId = await getWorkspaceId(user.id);
  if (!workspaceId) return apiError("No workspace", 403);

  const { name, description } = await req.json();
  if (!name?.trim()) return apiError("Name required", 400);

  const slug = name.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

  const project = await db.project.create({
    data: {
      workspaceId,
      name: name.trim(),
      slug,
      description: description?.trim() || null,
    },
  });

  return NextResponse.json(project, { status: 201 });
}
