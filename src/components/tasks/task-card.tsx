"use client";

const priorityColors: Record<string, string> = {
  critical: "var(--danger)",
  high: "var(--warning)",
  medium: "var(--accent)",
  low: "var(--muted)",
};

interface TaskCardProps {
  task: {
    id: string;
    title: string;
    description: string | null;
    priority: string;
    blocked: boolean;
    project: { name: string } | null;
    creator: { name: string };
    agent: { name: string } | null;
  };
  onClick: () => void;
}

export function TaskCard({ task, onClick }: TaskCardProps) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left panel rounded-xl p-3.5 hover:border-white/15 transition-colors cursor-pointer"
      style={{
        borderColor: task.blocked ? "var(--danger)" : undefined,
      }}
    >
      <div className="flex items-start gap-2">
        <div
          className="w-2 h-2 rounded-full mt-1.5 shrink-0"
          style={{ background: priorityColors[task.priority] || "var(--muted)" }}
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-snug truncate">
            {task.title}
          </p>
          <p
            className="text-xs mt-0.5 font-mono truncate cursor-pointer hover:text-white/80"
            style={{ color: "var(--muted)" }}
            title="Click to copy ID"
            onClick={(e) => {
              e.stopPropagation();
              navigator.clipboard.writeText(task.id);
            }}
          >
            ID: {task.id}
          </p>
          {task.description && (
            <p
              className="text-xs mt-1 line-clamp-2"
              style={{ color: "var(--muted)" }}
            >
              {task.description}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {task.project && (
              <span
                className="text-xs px-1.5 py-0.5 rounded"
                style={{
                  background: "rgba(124, 140, 255, 0.1)",
                  color: "var(--accent)",
                }}
              >
                {task.project.name}
              </span>
            )}
            {task.agent && (
              <span
                className="text-xs px-1.5 py-0.5 rounded"
                style={{
                  background: "rgba(55, 215, 255, 0.1)",
                  color: "var(--accent-2)",
                }}
              >
                {task.agent.name}
              </span>
            )}
            {task.blocked && (
              <span
                className="text-xs px-1.5 py-0.5 rounded"
                style={{
                  background: "rgba(251, 113, 133, 0.1)",
                  color: "var(--danger)",
                }}
              >
                Blocked
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
