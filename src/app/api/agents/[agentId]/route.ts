import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedUser, getWorkspaceId, isAdmin, apiError } from "@/lib/api-helpers";

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
      tasks: {
        orderBy: { updatedAt: "desc" },
        take: 10,
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          workflowState: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!agent || agent.workspace.id !== workspaceId) {
    return apiError("Agent not found", 404);
  }

  // Block non-admin from admin-only agents
  if (agent.visibility === "admin" && !isAdmin(user)) {
    return apiError("Agent not found", 404);
  }

  return NextResponse.json(agent);
}
