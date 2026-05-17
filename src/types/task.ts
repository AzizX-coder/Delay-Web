export interface Task {
  id: string;
  title: string;
  description: string;
  completed: number;
  priority: number;
  due_date: number | null;
  list_id: string | null;
  sort_order: number;
  created_at: number;
  updated_at: number;
  deleted_at: number;
}

export interface TaskList {
  id: string;
  name: string;
  color: string | null;
  icon: string;
  sort_order: number;
  created_at: number;
}

export type TaskPriority = 0 | 1 | 2 | 3;

export const PRIORITY_LABELS: Record<number, string> = {
  0: "None",
  1: "Low",
  2: "Medium",
  3: "High",
};

export const PRIORITY_COLORS: Record<number, string> = {
  0: "var(--color-text-tertiary)",
  1: "var(--color-success)",
  2: "var(--color-warning)",
  3: "var(--color-danger)",
};
