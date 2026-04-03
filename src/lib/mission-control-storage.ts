import { promises as fs } from 'fs';
import path from 'path';

export type StoredApproval = {
  id: string;
  title: string;
  owner: string;
  priority: string;
  due: string;
  impact: string;
};

export type StoredActivity = {
  id: string;
  actor: string;
  action: string;
  target: string;
  project: string;
  time: string;
  type: 'task' | 'approval' | 'summary' | 'blocker' | 'decision';
};

export type StoredTask = {
  id: string;
  title: string;
  description: string;
  owner: string;
  project: string;
  priority: string;
  status: string;
  lastUpdate: string;
  blocked?: boolean;
  dependencies?: string[];
  milestone?: string;
  progressNote?: string;
  deliveryMode?: string;
  assignToAgent?: boolean;
  notifyTelegram?: boolean;
  requiresApproval?: boolean;
  deliveryStatus?: 'draft' | 'stored' | 'queued' | 'sent';
};

export type StoredChatMessage = {
  id: string;
  agent: string;
  sender: 'Highrez' | 'Agent';
  text: string;
  relatedTaskId?: string;
  timestamp: string;
};

export type MissionControlState = {
  tasks: StoredTask[];
  activity: StoredActivity[];
  approvals: StoredApproval[];
  chat: StoredChatMessage[];
};

const dataDir = path.join(process.cwd(), 'data');
const statePath = path.join(dataDir, 'mission_control.json');
const tasksPath = path.join(dataDir, 'tasks.json');
const portfolioSnapshotPath = path.join(dataDir, 'portfolio_snapshot.json');

const defaultState: MissionControlState = {
  tasks: [],
  activity: [],
  approvals: [],
  chat: [],
};

async function ensureDataFiles() {
  await fs.mkdir(dataDir, { recursive: true });
  await ensureFile(statePath, JSON.stringify(defaultState, null, 2));
  await ensureFile(tasksPath, JSON.stringify([], null, 2));
  await ensureFile(portfolioSnapshotPath, JSON.stringify({ updatedAt: null, notes: 'Reserved for future portfolio snapshots.' }, null, 2));
}

async function ensureFile(filePath: string, defaultContent: string) {
  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, defaultContent, 'utf8');
  }
}

export async function readMissionControlState(): Promise<MissionControlState> {
  await ensureDataFiles();
  try {
    const raw = await fs.readFile(statePath, 'utf8');
    const parsed = JSON.parse(raw) as MissionControlState;
    return {
      tasks: parsed.tasks || [],
      activity: parsed.activity || [],
      approvals: parsed.approvals || [],
      chat: parsed.chat || [],
    };
  } catch {
    return defaultState;
  }
}

export async function writeMissionControlState(state: MissionControlState) {
  await ensureDataFiles();
  const normalized: MissionControlState = {
    tasks: state.tasks || [],
    activity: state.activity || [],
    approvals: state.approvals || [],
    chat: state.chat || [],
  };
  await fs.writeFile(statePath, JSON.stringify(normalized, null, 2), 'utf8');
  await fs.writeFile(tasksPath, JSON.stringify(normalized.tasks, null, 2), 'utf8');
  return normalized;
}
