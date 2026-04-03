export type TaskStatus = 'Recurring' | 'Backlog' | 'In Progress' | 'Review' | 'Done';
export type Priority = 'Critical' | 'High' | 'Medium' | 'Low';
export type DeliveryMode = 'store_only' | 'notify_telegram' | 'assign_to_agent' | 'notify_and_assign' | 'approval_required';

export type Task = {
  id: string;
  title: string;
  description: string;
  owner: string;
  project: string;
  priority: Priority;
  status: TaskStatus;
  lastUpdate: string;
  blocked?: boolean;
  dependencies?: string[];
  milestone?: string;
  progressNote?: string;
  deliveryMode?: DeliveryMode;
  assignToAgent?: boolean;
  notifyTelegram?: boolean;
  requiresApproval?: boolean;
  deliveryStatus?: 'draft' | 'stored' | 'queued' | 'sent';
};

export type ActivityItem = {
  id: string;
  actor: string;
  action: string;
  target: string;
  project: string;
  time: string;
  type: 'task' | 'approval' | 'summary' | 'blocker' | 'decision';
};

export const owners = ['Highrez', 'Main Agent', 'Finance Agent', 'Business Development Agent', 'Creative Director Agent', 'Mr Audit'];
export const projects = ['Aegis Launch', 'Northstar Ops', 'Helix CRM', 'Apollo Growth', 'Sentinel AI'];

export const approvals = [
  { id: 'p1', title: 'Outbound prompt pack', owner: 'Business Development Agent', priority: 'High', due: 'Today', impact: 'Campaign launch blocked' },
  { id: 'p2', title: 'Budget increase for contractor QA', owner: 'Main Agent', priority: 'Medium', due: 'Tomorrow', impact: 'Release speed risk' },
  { id: 'p3', title: 'Updated pricing copy', owner: 'Creative Director Agent', priority: 'Critical', due: 'Today', impact: 'Launch dependency' },
];

export const projectHealth = [
  { project: 'Aegis Launch', status: 'At Risk', workload: 82, health: 54, blockers: 3, deadline: 'Apr 03' },
  { project: 'Northstar Ops', status: 'On Track', workload: 68, health: 83, blockers: 0, deadline: 'Apr 08' },
  { project: 'Helix CRM', status: 'Closing', workload: 34, health: 92, blockers: 0, deadline: 'Mar 31' },
  { project: 'Apollo Growth', status: 'Needs Approval', workload: 59, health: 65, blockers: 2, deadline: 'Apr 04' },
  { project: 'Sentinel AI', status: 'Watching', workload: 45, health: 71, blockers: 1, deadline: 'Apr 12' },
];

export const teamWorkload = [
  { name: 'Highrez', focus: 'Executive direction', load: 42, active: 3, risk: 'Low' },
  { name: 'Main Agent', focus: 'Coordination + execution', load: 68, active: 5, risk: 'Medium' },
  { name: 'Finance Agent', focus: 'Cash flow + planning', load: 44, active: 2, risk: 'Low' },
  { name: 'Business Development Agent', focus: 'Pipeline + offers', load: 71, active: 4, risk: 'Medium' },
  { name: 'Creative Director Agent', focus: 'Creative strategy + messaging', load: 59, active: 3, risk: 'Low' },
  { name: 'Mr Audit', focus: 'Review, validation, and quality control', load: 21, active: 1, risk: 'Low' },
];

export const weeklySummary = {
  tasksThisWeek: 34,
  inProgress: 9,
  totalTasks: 86,
  completion: 72,
  overdue: 5,
  blockers: 6,
  decisions: 12,
  milestonesHit: 4,
};
