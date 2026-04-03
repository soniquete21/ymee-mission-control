import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedUser, getWorkspaceId, isAdmin, apiError } from "@/lib/api-helpers";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return apiError("Unauthorized", 401);

  const workspaceId = await getWorkspaceId(user.id);
  if (!workspaceId) return apiError("No workspace", 403);

  const admin = isAdmin(user);

  const agents = await db.agent.findMany({
    where: {
      workspaceId,
      // Non-admin users cannot see admin-only agents (Finance)
      ...(!admin && { visibility: "all" }),
    },
    include: {
      _count: { select: { tasks: true, runs: true, messages: true } },
    },
    orderBy: [{ priority: "asc" }, { name: "asc" }],
  });

  return NextResponse.json(agents);
}
