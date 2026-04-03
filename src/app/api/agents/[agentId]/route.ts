import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedUser, getWorkspaceId, apiError } from "@/lib/api-helpers";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;
  const user = await getAuthenticatedUser();
  if (!user) return apiError("Unauthorized", 401);

  const workspaceId = await getWorkspaceId(user.id);
  if (!workspaceId) return apiError("No workspace", 403);

  const agent = await db.agent.findUnique({
    where: { id: agentId },
    include: {
      workspace: { select: { id: true } },
      _count: { select: { tasks: true, messages: true, runs: true } },
    },
  });

  if (!agent || agent.workspace.id !== workspaceId) {
    return apiError("Agent not found", 404);
  }

  return NextResponse.json(agent);
}
