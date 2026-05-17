import { supabase } from "./supabase";
import { db, now } from "./database";
import type { Note } from "@/types/note";
import type { Task, TaskList } from "@/types/task";
import type { CalendarEvent } from "@/types/event";

// Maps local Dexie table name → Supabase table name.
// Mirrors the sync tables in supabase/schema.sql.
const TABLE_MAP: Record<string, string> = {
  notes: "user_notes",
  tasks: "user_tasks",
  taskLists: "user_task_lists",
  events: "user_events",
  codeSnippets: "user_code_snippets",
  timerSessions: "user_timer_sessions",
  memories: "user_memories",
  aiConversations: "user_ai_conversations",
  aiMessages: "user_ai_messages",
};

let drainTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleDrain(userId: string) {
  if (drainTimer) return;
  drainTimer = setTimeout(() => {
    drainTimer = null;
    flushQueue(userId);
  }, 2000);
}

/** Enqueue a write to be synced to Supabase */
export async function enqueueSync(
  tableName: string,
  recordId: string,
  operation: "upsert" | "delete",
  payload: object
) {
  if (!supabase) return; // offline mode — skip
  try {
    await db.sync_queue.add({
      table_name: tableName,
      record_id: recordId,
      operation,
      payload: JSON.stringify(payload),
      created_at: now(),
      attempts: 0,
    } as any);
    const userId = (window as any).__delayUserId as string | undefined;
    if (userId) scheduleDrain(userId);
  } catch {}
}

/** Drain the sync queue — push pending items to Supabase */
export async function flushQueue(userId: string) {
  if (!supabase || !navigator.onLine || !userId) return;

  let items: any[] = [];
  try {
    items = await db.sync_queue.orderBy("created_at").limit(100).toArray();
  } catch {
    return;
  }

  for (const item of items) {
    const supaTable = TABLE_MAP[item.table_name];
    if (!supaTable) {
      await db.sync_queue.delete(item.id).catch(() => {});
      continue;
    }
    try {
      let payload: Record<string, unknown>;
      try {
        payload = JSON.parse(item.payload);
      } catch {
        await db.sync_queue.delete(item.id).catch(() => {});
        continue;
      }

      if (item.operation === "upsert") {
        await supabase.from(supaTable).upsert({ ...payload, user_id: userId });
      } else {
        await supabase.from(supaTable).delete().eq("id", item.record_id).eq("user_id", userId);
      }
      await db.sync_queue.delete(item.id).catch(() => {});
    } catch {
      const attempts = (item.attempts ?? 0) + 1;
      if (attempts >= 5) {
        await db.sync_queue.delete(item.id).catch(() => {});
      } else {
        await db.sync_queue.update(item.id, { attempts }).catch(() => {});
      }
    }
  }
}

/** Pull fresh data from Supabase on login */
export async function pullFromSupabase(userId: string, since = 0) {
  if (!supabase || !userId) return;

  // `incCol` = the column used for incremental pulls. Tables without an
  // updated_at column (task lists, memories, ai messages, timer sessions)
  // are always pulled in full — they're small.
  const pulls: Array<{ supaTable: string; dexieTable: keyof typeof db; incCol?: string }> = [
    { supaTable: "user_notes", dexieTable: "notes", incCol: "updated_at" },
    { supaTable: "user_tasks", dexieTable: "tasks", incCol: "updated_at" },
    { supaTable: "user_task_lists", dexieTable: "taskLists" },
    { supaTable: "user_events", dexieTable: "events", incCol: "updated_at" },
    { supaTable: "user_code_snippets", dexieTable: "codeSnippets", incCol: "updated_at" },
    { supaTable: "user_timer_sessions", dexieTable: "timerSessions" },
    { supaTable: "user_memories", dexieTable: "memories" },
    { supaTable: "user_ai_conversations", dexieTable: "aiConversations", incCol: "updated_at" },
    { supaTable: "user_ai_messages", dexieTable: "aiMessages" },
  ];

  await Promise.all(
    pulls.map(async ({ supaTable, dexieTable, incCol }) => {
      try {
        let query = supabase!.from(supaTable).select("*").eq("user_id", userId);
        if (since > 0 && incCol) query = query.gte(incCol, since);
        const { data, error } = await query;
        if (error || !data) return;
        // Strip user_id before storing in Dexie
        const rows = data.map(({ user_id: _uid, ...rest }: any) => rest);
        if (rows.length > 0) {
          await (db as any)[dexieTable].bulkPut(rows);
        }
      } catch {}
    })
  );
}

/** Subscribe to real-time changes for a table */
export function subscribeToTable(
  supaTable: string,
  dexieTable: string,
  userId: string,
  onRefresh: () => void
) {
  if (!supabase) return null;

  const channel = supabase
    .channel(`${supaTable}:${userId}`)
    .on(
      "postgres_changes" as any,
      {
        event: "INSERT",
        schema: "public",
        table: supaTable,
        filter: `user_id=eq.${userId}`,
      },
      async (payload: any) => {
        if (payload?.new) {
          const { user_id: _uid, ...row } = payload.new;
          await (db as any)[dexieTable].put(row).catch(() => {});
          onRefresh();
        }
      }
    )
    .on(
      "postgres_changes" as any,
      {
        event: "UPDATE",
        schema: "public",
        table: supaTable,
        filter: `user_id=eq.${userId}`,
      },
      async (payload: any) => {
        if (payload?.new) {
          const { user_id: _uid, ...row } = payload.new;
          await (db as any)[dexieTable].put(row).catch(() => {});
          onRefresh();
        }
      }
    )
    .on(
      "postgres_changes" as any,
      {
        event: "DELETE",
        schema: "public",
        table: supaTable,
        filter: `user_id=eq.${userId}`,
      },
      async (payload: any) => {
        if (payload?.old?.id) {
          await (db as any)[dexieTable].delete(payload.old.id).catch(() => {});
          onRefresh();
        }
      }
    )
    .subscribe();

  return channel;
}
