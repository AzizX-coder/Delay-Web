import { create } from "zustand";
import { db, generateId, now } from "@/lib/database";
import type { Task, TaskList } from "@/types/task";
import { enqueueSync } from "@/lib/sync";

type TaskView = "inbox" | "today" | "upcoming" | "completed" | string;

interface TasksState {
  tasks: Task[];
  taskLists: TaskList[];
  activeView: TaskView;
  loading: boolean;
  loadTasks: () => Promise<void>;
  loadTaskLists: () => Promise<void>;
  createTask: (title: string, listId?: string) => Promise<string>;
  updateTask: (id: string, data: Partial<Task>) => Promise<void>;
  toggleTask: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  createTaskList: (name: string, color?: string, icon?: string) => Promise<string>;
  updateTaskList: (id: string, data: Partial<TaskList>) => Promise<void>;
  deleteTaskList: (id: string) => Promise<void>;
  setActiveView: (view: TaskView) => void;
  getFilteredTasks: () => Task[];
}

export const useTasksStore = create<TasksState>((set, get) => ({
  tasks: [],
  taskLists: [],
  activeView: "inbox",
  loading: true,

  loadTasks: async () => {
    try {
      const all = await db.tasks.where("deleted_at").equals(0).toArray();
      all.sort((a, b) => a.completed - b.completed || a.sort_order - b.sort_order || b.created_at - a.created_at);
      set({ tasks: all, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  loadTaskLists: async () => {
    try {
      const lists = await db.taskLists.orderBy("sort_order").toArray();
      set({ taskLists: lists });
    } catch {
      // silent
    }
  },

  createTask: async (title, listId = "inbox") => {
    const id = generateId();
    const timestamp = now();
    const task: Task = {
      id,
      title,
      description: "",
      completed: 0,
      priority: 0,
      due_date: null,
      list_id: listId,
      sort_order: 0,
      created_at: timestamp,
      updated_at: timestamp,
      deleted_at: 0,
    };

    set((state) => ({ tasks: [task, ...state.tasks] }));
    try {
      await db.tasks.add(task);
      enqueueSync("tasks", id, "upsert", task);
    } catch {
      set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) }));
    }
    return id;
  },

  updateTask: async (id, data) => {
    const timestamp = now();
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id ? { ...t, ...data, updated_at: timestamp } : t
      ),
    }));
    try {
      await db.tasks.update(id, { ...data, updated_at: timestamp });
      const task = get().tasks.find((t) => t.id === id);
      if (task) enqueueSync("tasks", id, "upsert", { ...task, ...data, updated_at: timestamp });
    } catch {
      // silent
    }
  },

  toggleTask: async (id) => {
    const task = get().tasks.find((t) => t.id === id);
    if (!task) return;
    const completing = !task.completed;
    await get().updateTask(id, { completed: completing ? 1 : 0 });
    
    if (completing) {
      import("./gamificationStore").then(m => {
        const gs = m.useGamificationStore.getState();
        gs.addXP(10, "Task completed");
        // Bonus if all today's tasks are now done
        const todayStart = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000);
        const todayEnd = todayStart + 86400;
        const todayTasks = get().tasks.filter(
          (t) => !t.deleted_at && t.due_date && t.due_date >= todayStart && t.due_date < todayEnd
        );
        if (todayTasks.length > 0 && todayTasks.every((t) => t.id === id ? true : !!t.completed)) {
          gs.addXP(50, "All today's tasks done!");
        }
      });
    }
  },

  deleteTask: async (id) => {
    set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) }));
    try {
      const deletedAt = now();
      await db.tasks.update(id, { deleted_at: deletedAt });
      const task = get().tasks.find((t) => t.id === id);
      if (task) enqueueSync("tasks", id, "upsert", { ...task, deleted_at: deletedAt });
    } catch {
      // silent
    }
  },

  createTaskList: async (name, color, icon = "list") => {
    const id = generateId();
    const timestamp = now();
    const list: TaskList = {
      id,
      name,
      color: color || null,
      icon,
      sort_order: get().taskLists.length,
      created_at: timestamp,
    };

    set((state) => ({ taskLists: [...state.taskLists, list] }));
    try {
      await db.taskLists.add(list);
    } catch {
      set((state) => ({ taskLists: state.taskLists.filter((l) => l.id !== id) }));
    }
    return id;
  },

  updateTaskList: async (id, data) => {
    set((state) => ({
      taskLists: state.taskLists.map((l) => (l.id === id ? { ...l, ...data } : l)),
    }));
    try {
      await db.taskLists.update(id, data);
    } catch {
      // silent
    }
  },

  deleteTaskList: async (id) => {
    if (id === "inbox") return;
    set((state) => ({
      taskLists: state.taskLists.filter((l) => l.id !== id),
      activeView: state.activeView === id ? "inbox" : state.activeView,
    }));
    try {
      await db.taskLists.delete(id);
      // Move tasks to inbox instead of leaving them orphaned
      const orphaned = await db.tasks.where("list_id").equals(id).toArray();
      for (const t of orphaned) {
        await db.tasks.update(t.id, { list_id: "inbox" });
      }
      // Update local state for tasks as well
      set((state) => ({
        tasks: state.tasks.map((t) => (t.list_id === id ? { ...t, list_id: "inbox" } : t)),
      }));
    } catch {
      // silent
    }
  },

  setActiveView: (view) => set({ activeView: view }),

  getFilteredTasks: () => {
    const { tasks, activeView } = get();
    const todayStart = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000);
    const todayEnd = todayStart + 86400;
    const weekEnd = todayStart + 86400 * 7;

    switch (activeView) {
      case "today":
        return tasks.filter(
          (t) => !t.completed && t.due_date && t.due_date >= todayStart && t.due_date < todayEnd
        );
      case "upcoming":
        return tasks.filter(
          (t) => !t.completed && t.due_date && t.due_date >= todayStart && t.due_date < weekEnd
        );
      case "completed":
        return tasks.filter((t) => t.completed);
      default:
        return tasks.filter((t) => t.list_id === activeView && !t.completed);
    }
  },
}));
