"use client";

import { useState } from "react";
import { useTasks } from "@/lib/hooks/use-tasks";
import { TaskCard } from "./task-card";
import { TaskForm } from "./task-form";
import { TaskDetail } from "./task-detail";
import { Plus } from "lucide-react";

const COLUMNS = [
  { key: "backlog", label: "Backlog" },
  { key: "in_progress", label: "In Progress" },
  { key: "review", label: "Review" },
  { key: "done", label: "Done" },
];

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  blocked: boolean;
  progressNote: string | null;
  createdAt: string;
  updatedAt: string;
  project: { id: string; name: string; slug: string } | null;
  creator: { id: string; name: string };
  assignee: { id: string; name: string } | null;
  agent: { id: string; name: string } | null;
};

export function TaskBoard() {
  const { tasks, isLoading, mutate } = useTasks();
  const [showForm, setShowForm] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [draggedTask, setDraggedTask] = useState<string | null>(null);

  async function handleDrop(taskId: string, newStatus: string) {
    // Optimistic update
    mutate(
      (tasks as Task[]).map((t: Task) =>
        t.id === taskId ? { ...t, status: newStatus } : t
      ),
      false
    );

    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });

    mutate();
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p style={{ color: "var(--muted)" }}>Loading tasks...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>
            {(tasks as Task[]).length} tasks total
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{
            background: "var(--accent)",
            color: "#fff",
          }}
        >
          <Plus size={16} />
          New Task
        </button>
      </div>

      {showForm && (
        <TaskForm
          onCreated={() => {
            setShowForm(false);
            mutate();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      <div className="grid grid-cols-4 gap-4">
        {COLUMNS.map((col) => {
          const columnTasks = (tasks as Task[]).filter(
            (t: Task) => t.status === col.key
          );

          return (
            <div
              key={col.key}
              className="rounded-xl p-3 min-h-[400px]"
              style={{
                background: "rgba(12, 18, 34, 0.4)",
                border: "1px solid var(--border)",
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (draggedTask) {
                  handleDrop(draggedTask, col.key);
                  setDraggedTask(null);
                }
              }}
            >
              <div className="flex items-center justify-between mb-3 px-1">
                <h3
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: "var(--muted)" }}
                >
                  {col.label}
                </h3>
                <span
                  className="text-xs font-medium px-1.5 py-0.5 rounded"
                  style={{
                    background: "rgba(124, 140, 255, 0.1)",
                    color: "var(--accent)",
                  }}
                >
                  {columnTasks.length}
                </span>
              </div>

              <div className="space-y-2">
                {columnTasks.map((task: Task) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={() => setDraggedTask(task.id)}
                    onDragEnd={() => setDraggedTask(null)}
                  >
                    <TaskCard
                      task={task}
                      onClick={() => setSelectedTask(task)}
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {selectedTask && (
        <TaskDetail
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdated={() => {
            mutate();
            setSelectedTask(null);
          }}
        />
      )}
    </div>
  );
}
