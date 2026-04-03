"use client";

import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import {
  Activity,
  AlertTriangle,
  Bot,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  Command,
  Files,
  Filter,
  FolderKanban,
  Gauge,
  LayoutDashboard,
  ListChecks,
  MemoryStick,
  MessageSquare,
  Minus,
  Plus,
  Search,
  Send,
  Settings,
  ShieldAlert,
  Sparkles,
  Users,
} from 'lucide-react';
import {
  approvals as seedApprovals,
  owners,
  projectHealth,
  projects,
  teamWorkload,
  type ActivityItem,
  type DeliveryMode,
  type Priority,
  type Task,
  type TaskStatus,
} from '@/lib/mission-control-data';

const nav = [
  ['Dashboard', LayoutDashboard],
  ['Tasks', FolderKanban],
  ['Agents', Bot],
  ['Projects', Gauge],
  ['Calendar', Calendar],
  ['Approvals', CheckCircle2],
  ['Team', Users],
  ['Memory / Notes', MemoryStick],
  ['Docs', Files],
  ['Settings / System', Settings],
] as const;

const columns: TaskStatus[] = ['Recurring', 'Backlog', 'In Progress', 'Review', 'Done'];
const priorities: Priority[] = ['Critical', 'High', 'Medium', 'Low'];
const deliveryModes: DeliveryMode[] = ['store_only', 'notify_telegram', 'assign_to_agent', 'notify_and_assign', 'approval_required'];
const agentTargets = owners.filter((owner) => owner !== 'Highrez');

const actorActionMap: Record<string, ActivityItem['type']> = {
  'created task': 'task',
  'changed status': 'task',
  'posted progress': 'task',
  'marked blocker': 'blocker',
  'cleared blocker': 'blocker',
  'requested approval': 'approval',
  'approved item': 'approval',
  'rejected item': 'approval',
  'logged decision': 'decision',
  'wrote note': 'summary',
  'queued delivery': 'task',
  'sent chat': 'summary',
};

const initialForm = {
  title: '',
  description: '',
  owner: owners[0],
  project: projects[0],
  priority: priorities[2],
  status: 'Backlog' as TaskStatus,
  deliveryMode: 'store_only' as DeliveryMode,
};

type ApprovalItem = typeof seedApprovals[number];
type ChatMessage = {
  id: string;
  agent: string;
  sender: 'Highrez' | 'Agent';
  text: string;
  relatedTaskId?: string;
  timestamp: string;
};

type PersistedState = {
  tasks: Task[];
  activity: ActivityItem[];
  approvals: ApprovalItem[];
  chat: ChatMessage[];
};

type ActivityPanelMode = 'open' | 'reduced' | 'hidden';

export default function MissionControlApp() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [feed, setFeed] = useState<ActivityItem[]>([]);
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [activeChatAgent, setActiveChatAgent] = useState(agentTargets[0]);
  const [chatInput, setChatInput] = useState('');
  const [projectFilter, setProjectFilter] = useState('All Projects');
  const [ownerFilter, setOwnerFilter] = useState('All Owners');
  const [search, setSearch] = useState('');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTask, setNewTask] = useState(initialForm);
  const [progressText, setProgressText] = useState('');
  const [decisionText, setDecisionText] = useState('');
  const [approvalRequestText, setApprovalRequestText] = useState('');
  const [deliveryMessage, setDeliveryMessage] = useState('');
  const [hydrated, setHydrated] = useState(false);
  const [activityPanelMode, setActivityPanelMode] = useState<ActivityPanelMode>('open');

  useEffect(() => {
    const loadState = async () => {
      try {
        const response = await fetch('/api/mission-control/state');
        const data = (await response.json()) as PersistedState;
        setTasks(data.tasks || []);
        setFeed(data.activity || []);
        setApprovals(data.approvals || []);
        setChat(data.chat || []);
      } catch (error) {
        console.error('Failed to load Mission Control state:', error);
      } finally {
        setHydrated(true);
      }
    };

    void loadState();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const saveState = async () => {
      try {
        await fetch('/api/mission-control/state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tasks, activity: feed, approvals, chat }),
        });
      } catch (error) {
        console.error('Failed to persist Mission Control state:', error);
      }
    };

    void saveState();
  }, [tasks, feed, approvals, chat, hydrated]);

  const pushFeed = (item: Omit<ActivityItem, 'id' | 'time' | 'type'> & { type?: ActivityItem['type'] }) => {
    const resolvedType = item.type || actorActionMap[item.action] || 'task';
    setFeed((current) => [{ id: crypto.randomUUID(), actor: item.actor, action: item.action, target: item.target, project: item.project, time: 'just now', type: resolvedType }, ...current].slice(0, 16));
  };

  const updateTask = (taskId: string, updater: (task: Task) => Task) => {
    setTasks((current) => current.map((task) => task.id === taskId ? updater(task) : task));
    setSelectedTask((current) => current && current.id === taskId ? updater(current) : current);
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesProject = projectFilter === 'All Projects' || task.project === projectFilter;
      const matchesOwner = ownerFilter === 'All Owners' || task.owner === ownerFilter;
      const query = search.toLowerCase();
      const matchesSearch = !query || [task.title, task.description, task.owner, task.project, task.progressNote || ''].some((v) => v.toLowerCase().includes(query));
      return matchesProject && matchesOwner && matchesSearch;
    });
  }, [tasks, projectFilter, ownerFilter, search]);

  const currentChat = chat.filter((message) => message.agent === activeChatAgent);

  const stats = useMemo(() => {
    const total = filteredTasks.length;
    const done = filteredTasks.filter((task) => task.status === 'Done').length;
    const inProgress = filteredTasks.filter((task) => task.status === 'In Progress').length;
    return {
      tasksThisWeek: tasks.length,
      inProgress,
      totalTasks: total,
      completion: total ? Math.round((done / total) * 100) : 0,
    };
  }, [filteredTasks, tasks.length]);

  const blockers = tasks.filter((task) => task.blocked);
  const overdue = tasks.filter((task) => task.status !== 'Done' && (task.priority === 'Critical' || task.priority === 'High')).slice(0, 4);

  const moveTask = (taskId: string, status: TaskStatus) => {
    const task = tasks.find((item) => item.id === taskId);
    if (!task) return;
    updateTask(taskId, (current) => ({ ...current, status, lastUpdate: 'just now', progressNote: `Moved to ${status}` }));
    pushFeed({ actor: task.owner, action: 'changed status', target: task.title, project: task.project, type: 'task' });
  };

  const createTask = () => {
    if (!newTask.title.trim()) return;
    const deliveryMode = newTask.deliveryMode;
    const created: Task = {
      id: crypto.randomUUID(),
      title: newTask.title.trim(),
      description: newTask.description.trim() || 'No description yet.',
      owner: newTask.owner,
      project: newTask.project,
      priority: newTask.priority,
      status: newTask.status,
      lastUpdate: 'just now',
      progressNote: 'Task created from command surface.',
      deliveryMode,
      notifyTelegram: deliveryMode === 'notify_telegram' || deliveryMode === 'notify_and_assign',
      assignToAgent: deliveryMode === 'assign_to_agent' || deliveryMode === 'notify_and_assign',
      requiresApproval: deliveryMode === 'approval_required',
      deliveryStatus: deliveryMode === 'store_only' ? 'stored' : 'draft',
    };
    setTasks((current) => [created, ...current]);
    setSelectedTask(created);
    pushFeed({ actor: created.owner, action: 'created task', target: created.title, project: created.project, type: 'task' });
    setNewTask(initialForm);
    setShowNewTask(false);
    if (activityPanelMode === 'hidden') setActivityPanelMode('reduced');
  };

  const postProgress = () => {
    if (!selectedTask || !progressText.trim()) return;
    const note = progressText.trim();
    updateTask(selectedTask.id, (task) => ({ ...task, progressNote: note, lastUpdate: 'just now' }));
    pushFeed({ actor: selectedTask.owner, action: 'posted progress', target: selectedTask.title, project: selectedTask.project, type: 'task' });
    setProgressText('');
    if (activityPanelMode === 'hidden') setActivityPanelMode('reduced');
  };

  const toggleBlocker = () => {
    if (!selectedTask) return;
    const blocked = !selectedTask.blocked;
    updateTask(selectedTask.id, (task) => ({ ...task, blocked, lastUpdate: 'just now' }));
    pushFeed({ actor: selectedTask.owner, action: blocked ? 'marked blocker' : 'cleared blocker', target: selectedTask.title, project: selectedTask.project, type: 'blocker' });
    if (activityPanelMode === 'hidden') setActivityPanelMode('reduced');
  };

  const requestApproval = () => {
    if (!selectedTask || !approvalRequestText.trim()) return;
    const title = approvalRequestText.trim();
    setApprovals((current) => [{ id: crypto.randomUUID(), title, owner: selectedTask.owner, priority: selectedTask.priority, due: 'Today', impact: `${selectedTask.project} waiting on approval` }, ...current]);
    pushFeed({ actor: selectedTask.owner, action: 'requested approval', target: title, project: selectedTask.project, type: 'approval' });
    setApprovalRequestText('');
    if (activityPanelMode === 'hidden') setActivityPanelMode('reduced');
  };

  const resolveApproval = (approvalId: string, decision: 'approved item' | 'rejected item') => {
    const approval = approvals.find((item) => item.id === approvalId);
    if (!approval) return;
    setApprovals((current) => current.filter((item) => item.id !== approvalId));
    pushFeed({ actor: approval.owner, action: decision, target: approval.title, project: approval.impact, type: 'approval' });
    if (activityPanelMode === 'hidden') setActivityPanelMode('reduced');
  };

  const logDecision = () => {
    if (!selectedTask || !decisionText.trim()) return;
    pushFeed({ actor: selectedTask.owner, action: 'logged decision', target: decisionText.trim(), project: selectedTask.project, type: 'decision' });
    setDecisionText('');
    if (activityPanelMode === 'hidden') setActivityPanelMode('reduced');
  };

  const sendTask = async () => {
    if (!selectedTask) return;
    const response = await fetch('/api/task-delivery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(selectedTask),
    });
    const data = await response.json();
    updateTask(selectedTask.id, (task) => ({ ...task, deliveryStatus: data.deliveryStatus === 'queued_for_delivery' ? 'queued' : 'stored', lastUpdate: 'just now' }));
    pushFeed({ actor: selectedTask.owner, action: 'queued delivery', target: selectedTask.title, project: selectedTask.project, type: 'task' });
    setDeliveryMessage(data.note || 'Delivery bridge responded.');
    if (activityPanelMode === 'hidden') setActivityPanelMode('reduced');
  };

  const sendChatMessage = () => {
    if (!chatInput.trim()) return;
    const message: ChatMessage = {
      id: crypto.randomUUID(),
      agent: activeChatAgent,
      sender: 'Highrez',
      text: chatInput.trim(),
      relatedTaskId: selectedTask?.id,
      timestamp: new Date().toLocaleString(),
    };
    setChat((current) => [...current, message]);
    pushFeed({ actor: 'Highrez', action: 'sent chat', target: activeChatAgent, project: selectedTask?.project || 'Mission Control', type: 'summary' });
    setChatInput('');
    if (activityPanelMode === 'hidden') setActivityPanelMode('reduced');
  };

  const activityPanelVisible = activityPanelMode !== 'hidden';
  const activityPanelWidth = activityPanelMode === 'open' ? 'w-[400px] xl:w-[460px]' : 'w-[96px]';

  return (
    <div className="grid-surface min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <div className="mx-auto flex min-h-screen max-w-[1960px] gap-5 px-3 py-3 xl:px-5">
        <aside className="panel hidden w-[240px] shrink-0 rounded-[30px] p-4 lg:flex lg:flex-col">
          <div className="mb-7 flex items-center gap-3 rounded-2xl px-2 py-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-2)] text-slate-950 shadow-lg shadow-indigo-500/20">
              <Command className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.28em] text-[var(--muted)]">Executive Ops</div>
              <div className="text-base font-semibold">Mission Control</div>
            </div>
          </div>

          <nav className="space-y-1.5">
            {nav.map(([label, Icon], index) => (
              <button key={label} className={clsx('flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left text-sm transition', index === 1 ? 'bg-white/[0.08] text-white shadow-inner shadow-white/5' : 'text-[var(--muted)] hover:bg-white/[0.04] hover:text-white')} type="button">
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </button>
            ))}
          </nav>

          <div className="mt-auto rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
            <div className="mb-3 text-sm font-medium">Workspace</div>
            <div className="space-y-2 text-sm text-[var(--muted)]">
              <div className="flex items-center justify-between"><span>Operator</span><span className="text-white">Highrez</span></div>
              <div className="flex items-center justify-between"><span>Approvals</span><span className="text-[var(--warning)]">{approvals.length}</span></div>
              <div className="flex items-center justify-between"><span>Blockers</span><span className="text-[var(--danger)]">{blockers.length}</span></div>
            </div>
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col gap-5">
          <header className="panel rounded-[30px] px-5 py-4 lg:px-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="max-w-4xl">
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-cyan-400/15 bg-cyan-400/8 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-cyan-200">
                  <Activity className="h-3.5 w-3.5" /> Highrez command surface
                </div>
                <h1 className="text-[30px] font-semibold tracking-tight">Mission Control</h1>
                <p className="mt-2 text-sm text-[var(--muted)]">Board-first control surface with native chat, persistent tasks, and a quieter operational workspace.</p>
              </div>

              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-[var(--muted)]">
                  <Search className="h-4 w-4" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} className="w-56 bg-transparent outline-none placeholder:text-[var(--muted)]" placeholder="Search tasks, projects, logs..." />
                </div>
                <button onClick={() => setShowNewTask((current) => !current)} className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-white/10">+ New Task</button>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {[
                ['Tasks', stats.totalTasks, 'Persisted and searchable'],
                ['In Progress', stats.inProgress, 'Live work in motion'],
                ['Completion', `${stats.completion}%`, 'Across active filters'],
                ['Approvals', approvals.length, 'Pending decision queue'],
              ].map(([label, value, sub]) => (
                <div key={label} className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">{label}</div>
                  <div className="mt-2 text-2xl font-semibold">{value}</div>
                  <div className="mt-1 text-xs text-[var(--muted)]">{sub}</div>
                </div>
              ))}
            </div>

            {showNewTask ? (
              <div className="mt-4 grid gap-3 rounded-[24px] border border-white/8 bg-slate-950/35 p-4 md:grid-cols-2 xl:grid-cols-6">
                <input value={newTask.title} onChange={(e) => setNewTask((current) => ({ ...current, title: e.target.value }))} placeholder="Task title" className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm outline-none" />
                <input value={newTask.description} onChange={(e) => setNewTask((current) => ({ ...current, description: e.target.value }))} placeholder="Short description" className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm outline-none md:col-span-2" />
                <select value={newTask.owner} onChange={(e) => setNewTask((current) => ({ ...current, owner: e.target.value }))} className="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm outline-none">{owners.map((owner) => <option key={owner}>{owner}</option>)}</select>
                <select value={newTask.project} onChange={(e) => setNewTask((current) => ({ ...current, project: e.target.value }))} className="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm outline-none">{projects.map((project) => <option key={project}>{project}</option>)}</select>
                <div className="flex gap-2">
                  <select value={newTask.priority} onChange={(e) => setNewTask((current) => ({ ...current, priority: e.target.value as Priority }))} className="flex-1 rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm outline-none">{priorities.map((priority) => <option key={priority}>{priority}</option>)}</select>
                  <button onClick={createTask} className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-950">Create</button>
                </div>
                <select value={newTask.deliveryMode} onChange={(e) => setNewTask((current) => ({ ...current, deliveryMode: e.target.value as DeliveryMode }))} className="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm outline-none xl:col-span-2">{deliveryModes.map((mode) => <option key={mode}>{mode}</option>)}</select>
              </div>
            ) : null}
          </header>

          <div className="flex min-h-0 gap-5">
            <section className="flex min-w-0 flex-1 flex-col gap-5">
              <div className="panel rounded-[30px] p-5 lg:p-6">
                <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">Task Board</h2>
                    <p className="mt-1 text-sm text-[var(--muted)]">Primary operating surface. Create tasks, assign agents, and route work from here.</p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <FilterPill label={projectFilter} items={['All Projects', ...projects]} onSelect={setProjectFilter} />
                    <FilterPill label={ownerFilter} items={['All Owners', ...owners]} onSelect={setOwnerFilter} />
                  </div>
                </div>

                {filteredTasks.length === 0 ? (
                  <div className="rounded-[26px] border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]"><FolderKanban className="h-6 w-6 text-cyan-300" /></div>
                    <div className="text-lg font-semibold">No active tasks yet</div>
                    <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[var(--muted)]">Use the New Task command to create the first operational item for Highrez or one of the specialist agents.</p>
                    <button onClick={() => setShowNewTask(true)} className="mt-5 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-950"><span className="inline-flex items-center gap-2"><Plus className="h-4 w-4" /> Create first task</span></button>
                  </div>
                ) : (
                  <div className="grid gap-4 xl:grid-cols-5">
                    {columns.map((column) => {
                      const columnTasks = filteredTasks.filter((task) => task.status === column);
                      return (
                        <div key={column} onDragOver={(e) => e.preventDefault()} onDrop={() => draggedTaskId && moveTask(draggedTaskId, column)} className="rounded-[24px] border border-white/6 bg-white/[0.02] p-3.5">
                          <div className="mb-3 flex items-center justify-between px-1">
                            <div><div className="text-sm font-medium">{column}</div><div className="text-xs text-[var(--muted)]">{columnTasks.length} tasks</div></div>
                            <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-[var(--muted)]">{columnTasks.length}</span>
                          </div>
                          <div className="space-y-3">
                            {columnTasks.map((task) => (
                              <button key={task.id} draggable onDragStart={() => setDraggedTaskId(task.id)} onClick={() => setSelectedTask(task)} className="rounded-[22px] border border-white/8 bg-[rgba(18,24,40,0.88)] p-4 text-left transition hover:border-white/18" type="button">
                                <div className="mb-3 flex items-start justify-between gap-3">
                                  <div>
                                    <div className="mb-1 flex items-center gap-2">
                                      <span className={clsx('h-2.5 w-2.5 rounded-full', task.priority === 'Critical' ? 'bg-rose-400' : task.priority === 'High' ? 'bg-amber-400' : task.priority === 'Medium' ? 'bg-cyan-400' : 'bg-emerald-400')} />
                                      <span className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">{task.priority}</span>
                                    </div>
                                    <div className="text-sm font-semibold leading-5 text-white">{task.title}</div>
                                  </div>
                                  {task.blocked ? <AlertTriangle className="h-4 w-4 text-rose-300" /> : <ListChecks className="h-4 w-4 text-[var(--muted)]" />}
                                </div>
                                <p className="mb-4 line-clamp-3 text-sm leading-5 text-[var(--muted)]">{task.description}</p>
                                <div className="flex flex-wrap gap-2 text-xs text-[var(--muted)]">
                                  <Badge>{task.owner}</Badge>
                                  <Badge>{task.project}</Badge>
                                </div>
                                {task.progressNote ? <div className="mt-4 rounded-2xl border border-cyan-400/10 bg-cyan-400/5 px-3 py-2 text-xs text-cyan-100">{task.progressNote}</div> : null}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
                <div className="panel rounded-[30px] p-5 lg:p-6">
                  <div className="mb-4 flex items-center justify-between"><div><h2 className="text-xl font-semibold">Project health</h2><p className="mt-1 text-sm text-[var(--muted)]">Compact project oversight below the board.</p></div><ShieldAlert className="h-5 w-5 text-[var(--warning)]" /></div>
                  <div className="space-y-3">
                    {projectHealth.map((item) => (
                      <div key={item.project} className="rounded-[22px] border border-white/8 bg-white/[0.02] p-4">
                        <div className="mb-3 flex items-center justify-between gap-4"><div><div className="font-medium">{item.project}</div><div className="text-xs text-[var(--muted)]">{item.status} · deadline {item.deadline}</div></div><span className={clsx('rounded-full px-3 py-1 text-xs', item.status === 'On Track' ? 'bg-emerald-400/15 text-emerald-300' : item.status === 'At Risk' ? 'bg-rose-400/15 text-rose-300' : 'bg-amber-400/15 text-amber-300')}>{item.status}</span></div>
                        <div className="grid grid-cols-3 gap-3 text-xs text-[var(--muted)]">
                          <MetricBar label="Health" value={item.health} tone="cyan" />
                          <MetricBar label="Workload" value={item.workload} tone="indigo" />
                          <MetricBar label="Blockers" value={item.blockers * 20} tone={item.blockers ? 'rose' : 'emerald'} suffix={`${item.blockers}`} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-5">
                  <div className="panel rounded-[30px] p-5 lg:p-6">
                    <div className="mb-4 flex items-center justify-between"><div><h2 className="text-xl font-semibold">Executive oversight</h2><p className="mt-1 text-sm text-[var(--muted)]">Risk, approvals, deadlines, and decisions.</p></div><Gauge className="h-5 w-5 text-cyan-300" /></div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <MiniPanel icon={AlertTriangle} title="Blockers" value={`${blockers.length} active`} tone="rose" sub={blockers[0]?.title || 'No blockers active'} />
                      <MiniPanel icon={CheckCircle2} title="Approvals" value={`${approvals.length} pending`} tone="amber" sub={approvals[0]?.title || 'Queue clear'} />
                      <MiniPanel icon={Calendar} title="Upcoming deadlines" value="5 in 7 days" tone="cyan" sub={overdue[0]?.title || 'No overdue items'} />
                      <MiniPanel icon={ListChecks} title="Decisions log" value={`${feed.filter((item) => item.type === 'decision').length} logged`} tone="indigo" sub="Driven by actions" />
                    </div>
                  </div>

                  <div className="panel rounded-[30px] p-5 lg:p-6">
                    <div className="mb-4 flex items-center justify-between"><div><h2 className="text-xl font-semibold">Mission Chat</h2><p className="mt-1 text-sm text-[var(--muted)]">Native communication inside Mission Control.</p></div><MessageSquare className="h-5 w-5 text-cyan-300" /></div>
                    <div className="mb-3 flex flex-wrap gap-2">
                      {agentTargets.map((agent) => (
                        <button key={agent} onClick={() => setActiveChatAgent(agent)} className={clsx('rounded-full px-3 py-2 text-xs', activeChatAgent === agent ? 'bg-white text-slate-950' : 'border border-white/10 bg-white/[0.03] text-[var(--muted)]')}>
                          {agent}
                        </button>
                      ))}
                    </div>
                    <div className="h-[280px] space-y-3 overflow-y-auto rounded-[22px] border border-white/8 bg-white/[0.02] p-4">
                      {currentChat.length > 0 ? currentChat.map((message) => (
                        <div key={message.id} className={clsx('max-w-[85%] rounded-2xl px-4 py-3 text-sm', message.sender === 'Highrez' ? 'ml-auto bg-white text-slate-950' : 'bg-white/[0.05] text-white')}>
                          <div className="mb-1 text-[11px] uppercase tracking-[0.18em] opacity-70">{message.sender}</div>
                          <div>{message.text}</div>
                          <div className="mt-2 text-[11px] opacity-60">{message.timestamp}</div>
                        </div>
                      )) : <div className="flex h-full items-center justify-center text-center text-sm text-[var(--muted)]">No messages yet with {activeChatAgent}. Start the conversation here.</div>}
                    </div>
                    <div className="mt-3 flex gap-3">
                      <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder={`Message ${activeChatAgent}...`} className="flex-1 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm outline-none" />
                      <button onClick={sendChatMessage} className="rounded-2xl bg-white px-4 py-3 text-slate-950"><Send className="h-4 w-4" /></button>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {activityPanelVisible ? (
              <aside className={clsx('shrink-0 transition-all duration-300 ease-out', activityPanelWidth)}>
                <div className="flex h-full flex-col gap-5">
                  <div className="panel rounded-[30px] p-4 lg:p-5">
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-semibold">Live Activity</h2>
                        {activityPanelMode === 'open' ? <p className="mt-1 text-sm text-[var(--muted)]">Expandable operational feed. Hide it when you want maximum board space.</p> : null}
                      </div>
                      <div className="flex items-center gap-2">
                        {activityPanelMode === 'open' ? <button onClick={() => setActivityPanelMode('reduced')} className="rounded-xl border border-white/8 bg-white/[0.03] p-2 text-[var(--muted)] hover:text-white"><Minus className="h-4 w-4" /></button> : <button onClick={() => setActivityPanelMode('open')} className="rounded-xl border border-white/8 bg-white/[0.03] p-2 text-[var(--muted)] hover:text-white"><ChevronsRight className="h-4 w-4" /></button>}
                        <button onClick={() => setActivityPanelMode('hidden')} className="rounded-xl border border-white/8 bg-white/[0.03] p-2 text-[var(--muted)] hover:text-white"><ChevronsLeft className="h-4 w-4" /></button>
                      </div>
                    </div>

                    {activityPanelMode === 'reduced' ? (
                      <div className="space-y-3">
                        <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-4 text-center">
                          <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Events</div>
                          <div className="mt-2 text-2xl font-semibold">{feed.length}</div>
                        </div>
                        <div className="space-y-2">
                          {feed.slice(0, 5).map((item) => (
                            <div key={item.id} className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3 text-center text-xs text-[var(--muted)]"><div className="mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.05] text-white">{item.actor.slice(0, 1)}</div>{item.time}</div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {feed.length > 0 ? feed.map((item) => (
                          <div key={item.id} className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
                            <div className="mb-2 flex items-center justify-between gap-3"><div className="flex items-center gap-2 text-sm font-medium"><span className={clsx('inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold', item.type === 'approval' ? 'bg-amber-400/15 text-amber-300' : item.type === 'blocker' ? 'bg-rose-400/15 text-rose-300' : item.type === 'summary' ? 'bg-cyan-400/15 text-cyan-300' : item.type === 'decision' ? 'bg-indigo-400/15 text-indigo-300' : 'bg-emerald-400/15 text-emerald-300')}>{item.actor.slice(0, 2).toUpperCase()}</span>{item.actor}</div><span className="text-xs text-[var(--muted)]">{item.time}</span></div>
                            <div className="text-sm text-white">{item.action} <span className="text-[var(--accent-2)]">{item.target}</span></div>
                            <div className="mt-2 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">{item.project}</div>
                          </div>
                        )) : <div className="rounded-[22px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-10 text-center text-sm text-[var(--muted)]">No live activity yet.</div>}
                      </div>
                    )}
                  </div>

                  <div className="panel rounded-[30px] p-5 lg:p-6">
                    <div className="mb-4 flex items-center justify-between"><div><h2 className="text-xl font-semibold">Task detail</h2><p className="mt-1 text-sm text-[var(--muted)]">Selected task controls live here.</p></div><ListChecks className="h-5 w-5 text-indigo-300" /></div>
                    {selectedTask ? (
                      <div className="space-y-4">
                        <div>
                          <div className="mb-2 flex items-center gap-2"><Badge>{selectedTask.project}</Badge><Badge>{selectedTask.owner}</Badge><Badge>{selectedTask.priority}</Badge></div>
                          <div className="text-lg font-semibold">{selectedTask.title}</div>
                          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{selectedTask.description}</p>
                        </div>
                        <div className="grid gap-3 rounded-[22px] border border-white/8 bg-white/[0.03] p-4 text-sm">
                          <DetailRow label="Last update" value={selectedTask.lastUpdate} />
                          <DetailRow label="Delivery status" value={selectedTask.deliveryStatus || 'draft'} />
                          <DetailRow label="Requires approval" value={selectedTask.requiresApproval ? 'Yes' : 'No'} />
                          <DetailRow label="Blocked" value={selectedTask.blocked ? 'Yes' : 'No'} />
                        </div>
                        <div className="rounded-[22px] border border-cyan-400/10 bg-cyan-400/5 p-4 text-sm text-cyan-100">{selectedTask.progressNote || 'No progress update posted yet.'}</div>

                        <div className="space-y-3 rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
                          <div className="text-sm font-medium">Progress update</div>
                          <textarea value={progressText} onChange={(e) => setProgressText(e.target.value)} placeholder="Post a progress update..." className="min-h-24 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm outline-none" />
                          <button onClick={postProgress} className="w-full rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950">Post progress</button>
                        </div>

                        <div className="grid gap-3 xl:grid-cols-2">
                          <button onClick={toggleBlocker} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-white">{selectedTask.blocked ? 'Clear blocker' : 'Mark blocker'}</button>
                          <select value={selectedTask.status} onChange={(e) => moveTask(selectedTask.id, e.target.value as TaskStatus)} className="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm outline-none">{columns.map((column) => <option key={column}>{column}</option>)}</select>
                        </div>

                        <button onClick={sendTask} className="w-full rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-950">Send / Queue task delivery</button>
                        {deliveryMessage ? <div className="rounded-[22px] border border-emerald-400/10 bg-emerald-400/5 px-4 py-3 text-sm text-emerald-100">{deliveryMessage}</div> : null}
                      </div>
                    ) : (
                      <div className="rounded-[22px] border border-dashed border-white/10 bg-white/[0.02] px-5 py-12 text-center">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]"><ListChecks className="h-6 w-6 text-indigo-300" /></div>
                        <div className="text-lg font-semibold">No task selected</div>
                        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[var(--muted)]">Select a card from the board to update progress, blockers, approvals, and delivery.</p>
                      </div>
                    )}
                  </div>
                </div>
              </aside>
            ) : (
              <aside className="w-[64px] shrink-0">
                <div className="panel flex h-full min-h-[220px] items-start justify-center rounded-[30px] p-3">
                  <button onClick={() => setActivityPanelMode('reduced')} className="rounded-2xl border border-white/8 bg-white/[0.03] p-3 text-[var(--muted)] hover:text-white"><ChevronsRight className="h-5 w-5" /></button>
                </div>
              </aside>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function FilterPill({ label, items, onSelect }: { label: string; items: string[]; onSelect: (value: string) => void }) {
  return (
    <div className="group relative">
      <button className="flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.03] px-4 py-2 text-sm text-[var(--muted)] hover:text-white"><Filter className="h-4 w-4" />{label}<ChevronDown className="h-4 w-4" /></button>
      <div className="invisible absolute right-0 z-20 mt-2 min-w-[220px] rounded-2xl border border-white/10 bg-slate-950/95 p-2 opacity-0 shadow-2xl transition group-hover:visible group-hover:opacity-100">
        {items.map((item) => <button key={item} className="block w-full rounded-xl px-3 py-2 text-left text-sm text-[var(--muted)] hover:bg-white/6 hover:text-white" onClick={() => onSelect(item)} type="button">{item}</button>)}
      </div>
    </div>
  );
}

function MiniPanel({ icon: Icon, title, value, sub, tone }: { icon: typeof AlertTriangle; title: string; value: string; sub: string; tone: 'rose' | 'amber' | 'cyan' | 'indigo' }) {
  const toneClasses = { rose: 'from-rose-400/18 to-rose-400/5 text-rose-200', amber: 'from-amber-400/18 to-amber-400/5 text-amber-200', cyan: 'from-cyan-400/18 to-cyan-400/5 text-cyan-200', indigo: 'from-indigo-400/18 to-indigo-400/5 text-indigo-200' };
  return <div className={clsx('rounded-[22px] border border-white/8 bg-gradient-to-br p-4', toneClasses[tone])}><div className="mb-3 flex items-center justify-between"><div className="text-sm font-medium text-white">{title}</div><Icon className="h-4 w-4" /></div><div className="text-xl font-semibold text-white">{value}</div><div className="mt-1 text-xs text-[var(--muted)]">{sub}</div></div>;
}

function MetricBar({ label, value, tone, suffix }: { label: string; value: number; tone: 'cyan' | 'indigo' | 'rose' | 'amber' | 'emerald'; suffix?: string }) {
  const tones = { cyan: 'bg-cyan-400', indigo: 'bg-indigo-400', rose: 'bg-rose-400', amber: 'bg-amber-400', emerald: 'bg-emerald-400' };
  return <div><div className="mb-2 flex items-center justify-between"><span>{label}</span><span>{suffix ?? `${value}%`}</span></div><div className="h-2 rounded-full bg-white/6"><div className={clsx('h-2 rounded-full', tones[tone])} style={{ width: `${Math.min(value, 100)}%` }} /></div></div>;
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">{children}</span>;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-4"><span className="text-[var(--muted)]">{label}</span><span className="font-medium text-white">{value}</span></div>;
}
