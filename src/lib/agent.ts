import { useNotesStore } from "@/stores/notesStore";
import { useTasksStore } from "@/stores/tasksStore";
import { useCalendarStore } from "@/stores/calendarStore";
import { db, generateId, now } from "@/lib/database";

interface ToolCall {
  name: string;
  arguments: Record<string, any>;
}

const MAX_TURNS = 12;

export async function processAgentRequest(
  input: string,
  onUpdate: (chunk: string | null, thought?: string | null) => void,
  callOllama: (prompt: string, onV: (v: string) => void) => Promise<string>
) {
  const nowUnix = Math.floor(Date.now() / 1000);
  const localNow = new Date().toISOString();
  const dayOfWeek = new Date().toLocaleDateString("en-US", { weekday: "long" });

  // Pre-compute ambient context so the agent reasons over *real* state.
  const tasksSnapshot = useTasksStore.getState().tasks;
  const listsSnapshot = useTasksStore.getState().taskLists;
  const openTasks = tasksSnapshot
    .filter((t) => !t.completed)
    .slice(0, 20)
    .map((t) => ({
      id: t.id,
      title: t.title,
      list_id: t.list_id,
      priority: t.priority,
      due_date: t.due_date,
      description: t.description?.slice(0, 60),
    }));
  const recentNotes = useNotesStore
    .getState()
    .notes.slice(0, 10)
    .map((n) => ({ id: n.id, title: n.title || "Untitled", preview: (n.content_text || "").slice(0, 120) }));
  const memSnapshot = (await db.memories.toArray()).slice(-12).map((m) => m.content);
  const upcomingEvents = useCalendarStore
    .getState()
    .events.filter((e) => e.start_time >= nowUnix && e.start_time <= nowUnix + 86400 * 7)
    .slice(0, 8)
    .map((e) => ({ id: e.id, title: e.title, start: e.start_time, end: e.end_time }));

  const systemPrompt = `You are **Delay Agent** — an autonomous, tool-using assistant embedded in a local-first productivity app.

Current time: ${localNow} (${dayOfWeek}, unix ${nowUnix}).

## OPERATING PRINCIPLES
1. **Be autonomous.** Decide → Act → Verify. Don't ask the user to re-confirm obvious intent.
2. **Prefer action over narration.** Call tools directly instead of explaining what you would do.
3. **Chain tools** across turns when the goal requires it (up to ${MAX_TURNS} turns).
4. **Think briefly** inside <think>…</think> after each tool result, then act or finish.
5. **Final reply**: concise, friendly markdown. No <think> tags. No raw JSON in the final output.
6. **Never invent IDs.** Use IDs from getTasks / listNotes / recallMemories results.
7. **On error**, read the error message and try a different approach — never repeat the same failing call.
8. **Save durable facts** about the user with saveMemory (preferences, recurring context, names).

## TOOL CALL FORMAT
Exactly one tool call per turn, in fenced JSON:
\`\`\`json
{ "tool_call": { "name": "<tool>", "arguments": { ... } } }
\`\`\`

## AVAILABLE TOOLS
| Tool | Args | Description |
|------|------|-------------|
| createNote | title, content | Create a note, returns id |
| updateNote | id, updates | updates: title, content_text, pinned, color |
| deleteNote | id | Delete a note |
| listNotes | query? | List notes, optional text filter |
| readNote | id | Full text of one note |
| createTask | title, listId?, due_date?, priority? | Create a task |
| updateTask | id, updates | updates: title, description, priority, due_date, completed |
| deleteTask | id | Delete a task |
| getTasks | filter? | "open", "today", "completed", "all" |
| createTaskList | name, icon? | Create a task list |
| createCalendarEvent | title, start, end, description? | Create event |
| listCalendarEvents | from?, to? | List events in range |
| searchWeb | query | Search DuckDuckGo |
| saveMemory | fact | Persist a durable fact |
| recallMemories | query? | Search stored memories |
| getCurrentTime | — | Returns current date/time/timezone |
| summarizeNote | id | Returns a brief summary of the note |
| finish | — | Signal completion |

## CURRENT STATE SNAPSHOT
**Open tasks** (${openTasks.length}): ${JSON.stringify(openTasks)}
**Recent notes** (${recentNotes.length}): ${JSON.stringify(recentNotes)}
**Task lists**: ${JSON.stringify(listsSnapshot.map((l) => ({ id: l.id, name: l.name })))}
**Upcoming events**: ${JSON.stringify(upcomingEvents)}
**Memories** (${memSnapshot.length}): ${JSON.stringify(memSnapshot)}`;

  let history = `\n\nUser: ${input}\nAgent:`;
  let turns = 0;
  let consecutiveErrors = 0;

  while (turns < MAX_TURNS) {
    turns++;
    let currentTurnResponse = "";
    let isThinking = false;
    let thinkBuffer = "";

    await callOllama(`${systemPrompt}${history}`, (token) => {
      currentTurnResponse += token;

      // Handle <think> tags — don't leak them into visible output
      if (token.includes("<think>")) {
        isThinking = true;
        thinkBuffer = "";
        return;
      }
      if (token.includes("</think>")) {
        isThinking = false;
        onUpdate(null, thinkBuffer);
        thinkBuffer = "";
        return;
      }

      if (isThinking) {
        thinkBuffer += token;
      } else {
        // Strip any residual <think> or </think> fragments
        const cleaned = token.replace(/<\/?think>/g, "");
        if (cleaned) onUpdate(cleaned, null);
      }
    });

    history += currentTurnResponse;

    const toolMatch = currentTurnResponse.match(/```json\s*\n([\s\S]*?)\n```/);
    if (!toolMatch) break;

    let parsed: any;
    try {
      parsed = JSON.parse(toolMatch[1]);
    } catch (e: any) {
      consecutiveErrors++;
      if (consecutiveErrors >= 3) break;
      history += `\nSystem Result: parse_error "${e.message}". Fix the JSON and try again.\nAgent:`;
      continue;
    }

    if (!parsed?.tool_call?.name) break;
    const tc: ToolCall = parsed.tool_call;
    if (tc.name === "finish") break;

    consecutiveErrors = 0;
    onUpdate(`\n\n*⚡ ${tc.name}…*\n\n`);

    const result = await executeTool(tc);
    history += `\nSystem Result (${tc.name}): ${result}\nAgent (think briefly, then either call the next tool or write a short final response):`;
  }
}

async function executeTool(toolCall: ToolCall): Promise<string> {
  try {
    const { name, arguments: args } = toolCall;
    switch (name) {
      case "createNote": {
        const id = await useNotesStore.getState().createNote();
        const text: string = args.content ?? "";
        await useNotesStore.getState().updateNote(id, {
          title: args.title,
          content_text: text,
          content: JSON.stringify({
            type: "doc",
            content: [
              { type: "paragraph", content: text ? [{ type: "text", text }] : [] },
            ],
          }),
        });
        return `ok id=${id}`;
      }
      case "updateNote":
        await useNotesStore.getState().updateNote(args.id, args.updates);
        return `ok`;
      case "deleteNote":
        await useNotesStore.getState().deleteNote(args.id);
        return `ok`;
      case "listNotes": {
        const notes = useNotesStore.getState().notes;
        const q = (args?.query || "").toLowerCase();
        const list = (q
          ? notes.filter(
              (n) =>
                (n.title || "").toLowerCase().includes(q) ||
                (n.content_text || "").toLowerCase().includes(q)
            )
          : notes
        )
          .slice(0, 20)
          .map((n) => ({ id: n.id, title: n.title || "Untitled", preview: (n.content_text || "").slice(0, 120) }));
        return JSON.stringify(list);
      }
      case "readNote": {
        const note = useNotesStore.getState().notes.find((n) => n.id === args.id);
        if (!note) return `not_found`;
        return JSON.stringify({ id: note.id, title: note.title, content: note.content_text });
      }
      case "summarizeNote": {
        const note = useNotesStore.getState().notes.find((n) => n.id === args.id);
        if (!note) return `not_found`;
        const text = note.content_text || "";
        const summary = text.slice(0, 300) + (text.length > 300 ? "..." : "");
        return JSON.stringify({ id: note.id, title: note.title, summary });
      }
      case "createTask": {
        const id = await useTasksStore.getState().createTask(args.title, args.listId);
        if (id && (args.due_date || args.priority)) {
          await useTasksStore.getState().updateTask(id, {
            ...(args.due_date ? { due_date: args.due_date } : {}),
            ...(args.priority ? { priority: args.priority } : {}),
          });
        }
        return `ok id=${id}`;
      }
      case "updateTask":
        await useTasksStore.getState().updateTask(args.id, args.updates);
        return `ok`;
      case "deleteTask":
        await useTasksStore.getState().deleteTask(args.id);
        return `ok`;
      case "getTasks": {
        const all = useTasksStore.getState().tasks;
        const filter = args?.filter || "open";
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        const todayUnix = Math.floor(today.getTime() / 1000);
        let list = all;
        if (filter === "open") list = all.filter((t) => !t.completed);
        else if (filter === "completed") list = all.filter((t) => t.completed);
        else if (filter === "today")
          list = all.filter((t) => !t.completed && t.due_date && t.due_date <= todayUnix);
        return JSON.stringify(
          list
            .slice(0, 25)
            .map((t) => ({ id: t.id, title: t.title, priority: t.priority, due: t.due_date, completed: !!t.completed, list_id: t.list_id }))
        );
      }
      case "createTaskList": {
        await useTasksStore.getState().createTaskList(args.name, undefined, args.icon);
        return `ok`;
      }
      case "createCalendarEvent":
        await useCalendarStore.getState().createEvent({
          title: args.title,
          start_time: args.start,
          end_time: args.end,
          all_day: 0,
          color: "#4F8AE6",
          description: args.description || "",
          recurrence: "none",
        });
        return `ok`;
      case "listCalendarEvents": {
        const events = useCalendarStore.getState().events;
        const from = args?.from ?? 0;
        const to = args?.to ?? Number.MAX_SAFE_INTEGER;
        return JSON.stringify(
          events
            .filter((e) => e.start_time >= from && e.start_time <= to)
            .slice(0, 20)
            .map((e) => ({ id: e.id, title: e.title, start: e.start_time, end: e.end_time }))
        );
      }
      case "searchWeb": {
        const sRes = await fetch(
          `https://api.duckduckgo.com/?q=${encodeURIComponent(args.query)}&format=json&no_redirect=1`
        );
        const sData = await sRes.json();
        const abstract = sData.AbstractText || sData.Heading || "";
        const related = (sData.RelatedTopics || [])
          .slice(0, 5)
          .map((r: any) => r.Text)
          .filter(Boolean)
          .join(" | ");
        return abstract || related || "no_results";
      }
      case "saveMemory":
        await db.memories.add({ id: generateId(), content: args.fact, created_at: now() });
        return `ok`;
      case "recallMemories": {
        const mems = await db.memories.toArray();
        const q = (args?.query || "").toLowerCase();
        const matches = q
          ? mems.filter((m) => m.content.toLowerCase().includes(q))
          : mems.slice(-15);
        return JSON.stringify(matches.map((m) => m.content));
      }
      case "getCurrentTime":
        return JSON.stringify({
          iso: new Date().toISOString(),
          unix: Math.floor(Date.now() / 1000),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          day: new Date().toLocaleDateString("en-US", { weekday: "long" }),
        });
      default:
        return `unknown_tool:${name}. Available: createNote, updateNote, deleteNote, listNotes, readNote, summarizeNote, createTask, updateTask, deleteTask, getTasks, createTaskList, createCalendarEvent, listCalendarEvents, searchWeb, saveMemory, recallMemories, getCurrentTime, finish`;
    }
  } catch (err: any) {
    return `error: ${err.message}`;
  }
}
