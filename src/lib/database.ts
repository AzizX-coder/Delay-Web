import Dexie, { type EntityTable } from "dexie";
import type { Note } from "@/types/note";
import type { Task, TaskList } from "@/types/task";
import type { CalendarEvent } from "@/types/event";
import type { AIConversation, AIMessage } from "@/types/ai";

interface SettingRow {
  key: string;
  value: string;
}

export interface CodeSnippet {
  id: string;
  title: string;
  language: string;
  code: string;
  created_at: number;
  updated_at: number;
}

export interface TimerSession {
  id: string;
  type: "focus" | "short_break" | "long_break";
  duration: number; // seconds
  completed: boolean;
  started_at: number;
  ended_at: number;
}

export interface SyncQueueItem {
  id: number;
  table_name: string;
  record_id: string;
  operation: "upsert" | "delete";
  payload: string; // JSON
  created_at: number;
  attempts: number;
}

export interface VoiceRecording {
  id: string;
  name: string;
  data: string;   // base64 data URL
  mime: string;   // audio/webm etc.
  duration: number; // seconds
  created_at: number;
}

export const db = new Dexie("DelayDB") as Dexie & {
  settings: EntityTable<SettingRow, "key">;
  notes: EntityTable<Note, "id">;
  tasks: EntityTable<Task, "id">;
  taskLists: EntityTable<TaskList, "id">;
  events: EntityTable<CalendarEvent, "id">;
  aiConversations: EntityTable<AIConversation, "id">;
  aiMessages: EntityTable<AIMessage, "id">;
  memories: EntityTable<{ id: string; content: string; created_at: number }, "id">;
  codeSnippets: EntityTable<CodeSnippet, "id">;
  timerSessions: EntityTable<TimerSession, "id">;
  sync_queue: EntityTable<SyncQueueItem, "id">;
  voice_recordings: EntityTable<VoiceRecording, "id">;
};

// v3 → preserved for migration continuity
db.version(3).stores({
  settings: "key",
  notes: "id, pinned, updated_at, deleted_at",
  tasks: "id, list_id, completed, due_date, sort_order, deleted_at",
  taskLists: "id, sort_order",
  events: "id, start_time, end_time, deleted_at",
  aiConversations: "id, updated_at",
  aiMessages: "id, conversation_id, created_at",
  memories: "id, created_at",
  codeSnippets: "id, updated_at",
  timerSessions: "id, started_at",
});

// v4 — adds sync_queue, voice_recordings, and is_public/public_slug on notes
db.version(4).stores({
  settings: "key",
  notes: "id, pinned, updated_at, deleted_at, is_public, public_slug",
  tasks: "id, list_id, completed, due_date, sort_order, deleted_at",
  taskLists: "id, sort_order",
  events: "id, start_time, end_time, deleted_at",
  aiConversations: "id, updated_at",
  aiMessages: "id, conversation_id, created_at",
  memories: "id, created_at",
  codeSnippets: "id, updated_at",
  timerSessions: "id, started_at",
  sync_queue: "++id, table_name, created_at",
  voice_recordings: "id, created_at",
});

// Seed default task list
db.on("populate", () => {
  db.taskLists.add({
    id: "inbox",
    name: "Inbox",
    color: null,
    icon: "inbox",
    sort_order: 0,
    created_at: now(),
  });
});

export function generateId(): string {
  return crypto.randomUUID();
}

export function now(): number {
  return Math.floor(Date.now() / 1000);
}
