import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedUser, getWorkspaceId, apiError } from "@/lib/api-helpers";

export async function GET(req: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return apiError("Unauthorized", 401);

  const workspaceId = await getWorkspaceId(user.id);
  if (!workspaceId) return apiError("No workspace", 403);

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "20");

  const events = await db.activityEvent.findMany({
    where: {
      OR: [
        { task: { workspaceId } },
        { project: { workspaceId } },
      ],
    },
    include: {
      actor: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 50),
  });

  return NextResponse.json(events);
}
