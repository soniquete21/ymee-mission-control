import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedUser, apiError } from "@/lib/api-helpers";

export async function GET(req: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return apiError("Unauthorized", 401);

  const { searchParams } = new URL(req.url);
  const taskId = searchParams.get("taskId");
  const projectId = searchParams.get("projectId");
  const agentId = searchParams.get("agentId");

  const messages = await db.message.findMany({
    where: {
      ...(taskId && { taskId }),
      ...(projectId && { projectId }),
      ...(agentId && { agentId }),
    },
    include: {
      sender: { select: { id: true, name: true } },
      agent: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
    take: 100,
  });

  return NextResponse.json(messages);
}

export async function POST(req: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return apiError("Unauthorized", 401);

  const { content, taskId, projectId, agentId } = await req.json();
  if (!content?.trim()) return apiError("Content required", 400);

  const message = await db.message.create({
    data: {
      content: content.trim(),
      senderId: user.id,
      taskId: taskId || null,
      projectId: projectId || null,
      agentId: agentId || null,
    },
    include: {
      sender: { select: { id: true, name: true } },
      agent: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(message, { status: 201 });
}
