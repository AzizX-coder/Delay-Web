import { streamChat } from "@/lib/ollama";
import { useCodeStudioStore } from "@/stores/codeStudioStore";

interface ToolCall {
  name: string;
  arguments: Record<string, any>;
}

const MAX_TURNS = 15;

export async function processCodingRequest(
  input: string,
  onUpdate: (chunk: string | null) => void,
  onTerminal: (chunk: string) => void
) {
  const model = "glm-5:cloud"; // Or pass from aiStore
  const workspacePath = useCodeStudioStore.getState().workspacePath;
  const sysPrompt = `You are a Coding Agent embedded inside a powerful Local Code Studio.
Current Workspace Root: ${workspacePath || "None (Warn user to open a folder!)"}

## CAPABILITIES
You have the ability to read the file tree, view files, write files natively to the user's hard drive, and run terminal commands (like npm, python script, node, etc). 
Because you possess FS access, you DO NOT output code blocks unless explaining. You use your tools.

## OPERATING PRINCIPLES
1. If the user asks you to build an app, USE TOOLS to create files, initialize package.json, or start dev servers.
2. Chain multiple tools silently.
3. Keep <think> thinking blocks inside your responses brief.
4. If an error occurs, try fixing your code and writing again.

## AVAILABLE TOOLS
| Tool | Args | Description |
|------|------|-------------|
| fsList | path? | Read contents of a directory (defaults to workspace root) |
| fsRead | path | Read text content of a file |
| fsWrite | path, content | Write (or overwrite) a file to disk |
| fsMkdir | path | Create a new directory |
| fsDelete | path | Delete a file or a folder recursively |
| fsRun | cmd, args[] | Run a terminal command (e.g. { "cmd": "npm", "args": ["install"] }) |
| finish | — | You are done fulfilling the user request |

## TOOL CALL FORMAT
Respond with EXACTLY ONE tool call in a fenced JSON block per turn:
\`\`\`json
{ "tool_call": { "name": "fsWrite", "arguments": { "path": "src/App.tsx", "content": "..." } } }
\`\`\`
`;

  let history = `\n\nUser: ${input}\nAgent:`;
  let turns = 0;
  let consecutiveErrors = 0;

  onTerminal(`\n\n[Agent Booting] Instructed: ${input}\n`);

  while (turns < MAX_TURNS) {
    turns++;
    let currentTurnResponse = "";
    let isThinking = false;
    
    // Convert history to array message
    const chatMessages = [
      { role: "system" as const, content: sysPrompt },
      { role: "user" as const, content: history }
    ];

    try {
      for await (const token of streamChat(model, chatMessages)) {
        currentTurnResponse += token;
        
        if (token.includes("<think>")) { isThinking = true; continue; }
        if (token.includes("</think>")) { isThinking = false; continue; }
        
        if (!isThinking) {
          const cleaned = token.replace(/<\/?think>/g, "");
          if (cleaned) onUpdate(cleaned);
        }
      }
    } catch (err: any) {
      onTerminal(`[Agent Error] ${err.message}\n`);
      break;
    }

    history += currentTurnResponse;

    const toolMatch = currentTurnResponse.match(/```json\s*\n([\s\S]*?)\n```/);
    if (!toolMatch) break;

    let parsed: any;
    try {
       parsed = JSON.parse(toolMatch[1]);
    } catch (e) {
       consecutiveErrors++;
       if (consecutiveErrors > 3) break;
       history += `\nSystem Result: Invalid JSON. Please fix it.\nAgent:`;
       continue;
    }

    if (!parsed?.tool_call?.name) break;
    const tc: ToolCall = parsed.tool_call;
    if (tc.name === "finish") {
      onTerminal(`[Agent Completed Task]\n`);
      break;
    }

    onTerminal(`[Agent Execute] ${tc.name}(${JSON.stringify(tc.arguments).slice(0, 100)})\n`);
    const electron = (window as any).electronAPI?.codeStudio;
    if (!electron) {
       history += `\nSystem Result: Electron API unavailable.\nAgent:`;
       continue;
    }

    let result = "";
    try {
      if (tc.name === "fsList") {
        const p = tc.arguments.path || workspacePath;
        const res = await electron.fsList(p);
        result = JSON.stringify(res).slice(0, 5000);
      } 
      else if (tc.name === "fsRead") {
        const p = getAbsolutePath(tc.arguments.path, workspacePath);
        const res = await electron.fsRead(p);
        result = res.error ? `Error: ${res.error}` : res.content.slice(0, 8000);
      }
      else if (tc.name === "fsWrite") {
        const p = getAbsolutePath(tc.arguments.path, workspacePath);
        const res = await electron.fsWrite(p, tc.arguments.content);
        if (res.ok) {
          result = "File written successfully.";
          // Update IDE store if open
          useCodeStudioStore.getState().updateFileContent(p, tc.arguments.content);
        } else {
          result = `Error: ${res.error}`;
        }
      }
      else if (tc.name === "fsMkdir") {
        const p = getAbsolutePath(tc.arguments.path, workspacePath);
        const res = await electron.fsMkdir(p);
        result = res.ok ? "Directory created." : `Error: ${res.error}`;
      }
      else if (tc.name === "fsDelete") {
        const p = getAbsolutePath(tc.arguments.path, workspacePath);
        const res = await electron.fsDelete(p);
        result = res.ok ? "Target deleted." : `Error: ${res.error}`;
      }
      else if (tc.name === "fsRun") {
        const { cmd, args } = tc.arguments;
        const res = await electron.fsRun(cmd, args || [], workspacePath);
        result = `Command started. Run ID: ${res.runId}. You don't need to wait for it.`;
        
        electron.onFsRunData(res.runId, (data: string) => onTerminal(data));
      }
      else {
        result = `System Error: Unknown tool.`;
      }
    } catch (err: any) {
      result = `System Trap Error: ${err.message}`;
    }

    history += `\nSystem Result (${tc.name}): ${result}\nAgent (think, then tool):`;
  }
}

function getAbsolutePath(relPath: string, root: string | null) {
  if (relPath.includes(":\\") || relPath.startsWith("/")) return relPath;
  return root ? `${root}/${relPath}` : relPath;
}
