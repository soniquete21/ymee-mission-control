# Mission Control

Premium dark executive operations dashboard built with Next.js, React, TypeScript, and Tailwind.

## What it includes
- Executive dashboard stats
- Kanban task board with drag-and-drop
- Action-driven live activity feed
- Project health and risk visibility
- Approvals queue
- Team workload view
- Task detail panel
- Search + project/owner filters
- Pages/sections shell for Dashboard, Tasks, Agents, Projects, Calendar, Approvals, Team, Memory / Notes, Docs, and Settings / System
- Task delivery bridge scaffold for Telegram + future agent routing

## Run locally

```bash
cd mission-control
npm install
npm run dev
```

Then open:

```text
http://localhost:3000
```

## Configure Telegram delivery through OpenClaw
Create or edit:

```text
mission-control/.env.local
```

Set:

```env
OPENCLOW_GATEWAY_URL=http://127.0.0.1:18789
OPENCLOW_GATEWAY_TOKEN=your_gateway_token_here
MISSION_CONTROL_TELEGRAM_CHAT_ID=telegram:1324774242
```

Notes:
- keep the token server-side only
- do not expose the token in frontend code
- restart `npm run dev` after changing `.env.local`

## Agent orchestration model

Current named roles:
- Highrez (human operator)
- Main Agent
- Finance Agent
- Business Development Agent
- Creative Director Agent
- Mr Audit (review / validation agent)

### Mr Audit
Mr Audit is an on-demand verification and quality-control agent.

Use Mr Audit only for high-impact work such as:
- financial decisions
- trading-related outputs
- business strategy
- cost-impact recommendations
- any recommendation where weak assumptions or logic errors would be expensive

Do not run Mr Audit on every request.

### When Highrez should trigger Mr Audit
Trigger Mr Audit when one or more of these are true:
- meaningful money is involved
- risk is hard to reverse
- assumptions are uncertain
- a recommendation could create strategic downside
- clarity or confidence is low
- the output will be executed or shared externally

### Mr Audit review format
Input:
- original request
- primary agent output
- important assumptions
- risk level

Output:
- verdict
- key risks
- weak assumptions
- possible errors
- suggested improvements
- confidence level

Keep Mr Audit concise, structured, and focused on validation rather than rewriting everything.
