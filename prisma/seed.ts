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

  // ─── Agent Definitions ───
  const agents = [
    {
      name: "Main Agent",
      slug: "main-agent",
      role: "Orchestration & Task Routing",
      type: "coordinator",
      priority: "critical",
      visibility: "all",
      description:
        "Primary interface with Highrez. Coordinates all work across specialist agents, routes tasks to the right domain, summarizes outcomes, and decides when to escalate to Audit.",
      skills: JSON.stringify([
        "Task routing & delegation",
        "Cross-agent coordination",
        "Priority triage",
        "Status summarization",
        "Escalation decisions",
        "Workflow orchestration",
      ]),
      capabilities: JSON.stringify({
        domain: "Operations & Coordination",
        strengths: [
          "Understanding user intent",
          "Matching tasks to specialist agents",
          "Aggregating outputs across agents",
          "Managing workflow state transitions",
        ],
        focus: "Route, coordinate, and summarize — never execute specialist work directly",
      }),
    },
    {
      name: "Developer Agent",
      slug: "developer-agent",
      role: "Software & Shopify Development",
      type: "specialist",
      priority: "critical",
      visibility: "all",
      description:
        "Highest-priority specialist agent. Handles all Shopify development, theme customization, app/plugin development, web applications, software architecture, debugging, API integrations, and deployment preparation. Treated as a primary execution unit.",
      skills: JSON.stringify([
        "Shopify theme development",
        "Shopify app development",
        "Shopify plugin/integration work",
        "Frontend development (React, Next.js, HTML/CSS/JS)",
        "Backend & API development (Node.js, Python, REST, GraphQL)",
        "Debugging & troubleshooting",
        "Code review",
        "Deployment preparation",
        "Workflow automation",
        "Internal tool development",
        "Database design & optimization",
        "CI/CD pipeline configuration",
      ]),
      capabilities: JSON.stringify({
        domain: "Software Engineering",
        strengths: [
          "Shopify Liquid themes & Hydrogen/Remix storefronts",
          "Full-stack web application development",
          "Plugin and app architecture",
          "Performance optimization",
          "Integration with third-party APIs and services",
          "Production-grade code delivery",
        ],
        focus: "Shopify development, plugin/app development, and all software engineering tasks — the strongest execution specialist",
      }),
    },
    {
      name: "Creative Agent",
      slug: "creative-agent",
      role: "Creative Direction & Visual Production",
      type: "specialist",
      priority: "normal",
      visibility: "all",
      description:
        "Handles ComfyUI workflows, image generation, creative concepts, prompt refinement, style consistency, and visual asset production for all projects.",
      skills: JSON.stringify([
        "ComfyUI workflow design",
        "Image generation & refinement",
        "Prompt engineering for visual AI",
        "Creative concept development",
        "Style consistency & brand guidelines",
        "Visual asset production",
        "Design direction",
        "Branding support",
      ]),
      capabilities: JSON.stringify({
        domain: "Creative & Visual",
        strengths: [
          "ComfyUI pipeline design and optimization",
          "AI image generation across models",
          "Creative concepting and mood boards",
          "Maintaining visual consistency across outputs",
        ],
        focus: "Visual production, creative direction, and AI-powered design workflows",
      }),
    },
    {
      name: "Business Agent",
      slug: "business-agent",
      role: "Business Development & Growth",
      type: "specialist",
      priority: "normal",
      visibility: "all",
      description:
        "Handles client acquisition, offer creation, outreach systems, pipeline management, proposals, and growth workflow design.",
      skills: JSON.stringify([
        "Client acquisition strategy",
        "Offer creation & packaging",
        "Outreach systems & automation",
        "Pipeline management",
        "Proposal writing",
        "Workflow design for growth",
        "Market positioning",
        "Partnership development",
      ]),
      capabilities: JSON.stringify({
        domain: "Business Development",
        strengths: [
          "Structured growth strategies",
          "Outreach campaign design",
          "Client pipeline optimization",
          "Revenue model analysis",
        ],
        focus: "Client growth, business development, and revenue pipeline management",
      }),
    },
    {
      name: "Finance Agent",
      slug: "finance-agent",
      role: "Financial & Trading Intelligence",
      type: "specialist",
      priority: "high",
      visibility: "admin",
      description:
        "Admin-only specialist. Handles financial analysis, crypto/stock analysis, structured market reports, budgeting, risk framing, and trading intelligence. Visible only to Highrez.",
      skills: JSON.stringify([
        "Financial analysis",
        "Crypto market analysis",
        "Stock market analysis",
        "Structured market reports",
        "Budgeting & forecasting",
        "Risk framing & assessment",
        "Trading intelligence (analysis only)",
        "Portfolio review",
        "Cost-benefit analysis",
      ]),
      capabilities: JSON.stringify({
        domain: "Finance & Markets",
        strengths: [
          "Crypto and equity market analysis",
          "Structured trading frameworks",
          "Budget modeling and forecasting",
          "Risk/reward assessment",
        ],
        focus: "Financial intelligence, market analysis, and structured reporting — analysis only, never financial advice",
      }),
    },
    {
      name: "Audit Agent",
      slug: "audit-agent",
      role: "Review, Validation & Quality Control",
      type: "audit",
      priority: "normal",
      visibility: "all",
      description:
        "On-demand verification and quality-control agent. Used selectively for high-impact tasks — financial decisions, trading outputs, business strategy, and recommendations where weak assumptions would be expensive. Not a blocker on every workflow.",
      skills: JSON.stringify([
        "Validation & verification",
        "Quality review",
        "Assumption checking",
        "Risk review",
        "Logic validation",
        "Final approval support",
        "Output confidence assessment",
        "Error detection",
      ]),
      capabilities: JSON.stringify({
        domain: "Quality Assurance & Risk",
        strengths: [
          "Structured validation of agent outputs",
          "Identifying weak assumptions",
          "Risk and logic review",
          "Confidence-level assessment",
        ],
        focus: "Selective review for high-impact work — not a mandatory gate on every task",
      }),
    },
  ];

  for (const agent of agents) {
    await prisma.agent.upsert({
      where: { workspaceId_slug: { workspaceId: workspace.id, slug: agent.slug } },
      update: {
        name: agent.name,
        role: agent.role,
        type: agent.type,
        priority: agent.priority,
        visibility: agent.visibility,
        description: agent.description,
        skills: agent.skills,
        capabilities: agent.capabilities,
      },
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
