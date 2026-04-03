import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { hashSync } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Create default user (Highrez)
  const user = await prisma.user.upsert({
    where: { email: "highrez@missioncontrol.local" },
    update: {},
    create: {
      name: "Highrez",
      email: "highrez@missioncontrol.local",
      passwordHash: hashSync("mission2024", 10),
      role: "admin",
    },
  });

  // Create default workspace
  const workspace = await prisma.workspace.upsert({
    where: { slug: "hq" },
    update: {},
    create: {
      name: "Mission Control HQ",
      slug: "hq",
      members: {
        create: {
          userId: user.id,
          role: "owner",
        },
      },
    },
  });

  // Seed agents
  const agents = [
    { name: "Main Agent", slug: "main-agent", role: "General orchestration and task routing" },
    { name: "Software Developer Agent", slug: "software-dev", role: "Code tasks, builds, and technical implementation" },
    { name: "Mr Finance", slug: "mr-finance", role: "Crypto and stock analysis, structured trading framework" },
    { name: "Mr Growth", slug: "mr-growth", role: "Growth strategy, marketing, and business development" },
    { name: "Mr Creative", slug: "mr-creative", role: "Design, branding, and creative direction" },
    { name: "Mr Audit", slug: "mr-audit", role: "High-impact review, logic validation, and risk assessment" },
  ];

  for (const agent of agents) {
    await prisma.agent.upsert({
      where: { workspaceId_slug: { workspaceId: workspace.id, slug: agent.slug } },
      update: {},
      create: {
        workspaceId: workspace.id,
        ...agent,
      },
    });
  }

  // Seed projects
  const projects = [
    { name: "Aegis Launch", slug: "aegis-launch", description: "Core product launch initiative" },
    { name: "Northstar Ops", slug: "northstar-ops", description: "Operations and infrastructure" },
    { name: "Apollo Growth", slug: "apollo-growth", description: "Growth and revenue campaigns" },
  ];

  for (const project of projects) {
    await prisma.project.upsert({
      where: { workspaceId_slug: { workspaceId: workspace.id, slug: project.slug } },
      update: {},
      create: {
        workspaceId: workspace.id,
        ...project,
      },
    });
  }

  console.log("Seed complete:", { user: user.email, workspace: workspace.slug });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
