import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Editor } from "@monaco-editor/react";
import { useCodeStudioStore, FileNode } from "@/stores/codeStudioStore";
import { useThemeStore } from "@/stores/themeStore";
import {
  FolderOpen,
  FileCode,
  Folder,
  TerminalSquare,
  Play,
  Copy,
  ChevronRight,
  ChevronDown,
  Code2,
  Trash2,
  Check,
  X,
  Sparkles,
  Send,
  Loader2,
  Globe,
  GitBranch,
  RotateCw,
  PlusCircle,
  FolderPlus,
  Monitor,
  Smartphone,
  Tablet,
  RefreshCw,
  ChevronLeft
} from "lucide-react";
import { processCodingRequest } from "@/lib/codingAgent";

// Recursive File Tree Component
function FileTreeNode({ node, depth = 0 }: { node: FileNode, depth?: number }) {
  const { openFile, activeFilePath, closeFile } = useCodeStudioStore();
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState<FileNode[]>([]);
  const [loading, setLoading] = useState(false);

  const isActive = activeFilePath === node.path;

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (node.isDir) {
      if (!expanded && children.length === 0) {
        setLoading(true);
        try {
          const res = await (window as any).electronAPI.codeStudio.fsList(node.path);
          if (!res.error) {
            res.sort((a: any, b: any) => {
              if (a.isDir === b.isDir) return a.name.localeCompare(b.name);
              return a.isDir ? -1 : 1;
            });
            setChildren(res);
          }
        } catch {}
        setLoading(false);
      }
      setExpanded(!expanded);
    } else {
      openFile(node.path, node.name);
    }
  };

  return (
    <div className="w-full">
      <div 
        onClick={handleToggle}
        className={`flex items-center gap-1.5 py-1 px-2 cursor-pointer
          hover:bg-bg-hover transition-colors select-none text-[12px]
          ${isActive ? 'bg-accent/15 text-accent' : 'text-text-secondary'}
        `}
        style={{ paddingLeft: `${(depth * 12) + 8}px` }}
      >
        <span className="w-3.5 h-3.5 flex items-center justify-center opacity-70">
          {node.isDir ? (
            expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />
          ) : (
            <FileCode size={11} className={isActive ? "text-accent" : ""} />
          )}
        </span>
        <span className="truncate flex-1 font-medium tracking-wide">
          {node.name}
        </span>
      </div>

      <AnimatePresence>
        {expanded && node.isDir && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            {loading ? (
              <div style={{ paddingLeft: `${((depth + 1) * 12) + 8}px` }} className="py-1 text-[10px] text-text-tertiary">
                Loading...
              </div>
            ) : (
              children.map((child) => (
                <FileTreeNode key={child.path} node={child} depth={depth + 1} />
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function CodeStudioPage() {
  const {
    workspacePath,
    setWorkspacePath,
    fileTree,
    openFiles,
    activeFilePath,
    setActiveFile,
    closeFile,
    updateFileContent,
    saveActiveFile,
    terminalOutput,
    appendTerminalOutput,
    clearTerminal
  } = useCodeStudioStore();

  const { resolved: themeResolved } = useThemeStore();
  const [terminalCmd, setTerminalCmd] = useState("");
  const [showTerminal, setShowTerminal] = useState(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Coding Agent State
  const [showAIInput, setShowAIInput] = useState(false);
  const [aiInput, setAiInput] = useState("");
  const [isAiStreaming, setIsAiStreaming] = useState(false);
  const aiInputRef = useRef<HTMLInputElement>(null);
  
  const [newPromptType, setNewPromptType] = useState<"file" | "folder" | null>(null);
  const [newPromptName, setNewPromptName] = useState("");
  const newPromptInputRef = useRef<HTMLInputElement>(null);

  // Preview State
  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("http://localhost:5173");
  const [deviceSize, setDeviceSize] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (workspacePath) {
      useCodeStudioStore.getState().loadFileTree();
    }
  }, [workspacePath]);

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [terminalOutput, showTerminal]);

  useEffect(() => {
    if (showAIInput && aiInputRef.current) aiInputRef.current.focus();
  }, [showAIInput]);

  useEffect(() => {
    if (newPromptType && newPromptInputRef.current) newPromptInputRef.current.focus();
  }, [newPromptType]);

  const activeFile = openFiles.find(f => f.path === activeFilePath);

  // Map keyboard shortcuts for saves
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Save file
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveActiveFile();
      }
      // AI input
      if ((e.ctrlKey || e.metaKey) && e.key === 'q') {
        e.preventDefault();
        setShowAIInput(p => !p);
      }
      // Terminal toggle
      if ((e.ctrlKey || e.metaKey) && e.key === 'j') {
        e.preventDefault();
        setShowTerminal(p => !p);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saveActiveFile]);

  const handleOpenFolder = async () => {
    const electronAPI = (window as any).electronAPI;
    if (electronAPI?.codeStudio?.openWorkspace) {
      const p = await electronAPI.codeStudio.openWorkspace();
      if (p) {
        setWorkspacePath(p);
      }
    } else {
      // Fallback
      alert("Please run within Delay Desktop App to open native folders.");
    }
  };

  const handleRunCommand = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!terminalCmd.trim()) return;
    setShowTerminal(true);
    appendTerminalOutput(`\n> ${terminalCmd}\n`);
    
    // Simple split for command + args (naive, but works for basic usage)
    const parts = terminalCmd.trim().split(" ");
    const cmd = parts[0];
    const args = parts.slice(1);
    
    const electronAPI = (window as any).electronAPI;
    if (electronAPI?.codeStudio?.fsRun && workspacePath) {
       const res = await electronAPI.codeStudio.fsRun(cmd, args, workspacePath);
       if (res.runId) {
         electronAPI.codeStudio.onFsRunData(res.runId, (data: string) => {
           appendTerminalOutput(data);
         });
         electronAPI.codeStudio.onFsRunExit(res.runId, (code: number) => {
           appendTerminalOutput(`\n[Process exited with code ${code}]\n`);
         });
       }
    }
    setTerminalCmd("");
  };

  const executeCodingAgent = async () => {
     if (!aiInput.trim() || isAiStreaming || !workspacePath) return;
     setIsAiStreaming(true);
     setShowTerminal(true);
     
     await processCodingRequest(
       aiInput,
       (chunk) => {
         // Could stream thoughts to a panel, but we'll log it to terminal or just ignore
       },
       (terminalText) => {
         appendTerminalOutput(terminalText);
       }
     );
     
     setIsAiStreaming(false);
     setAiInput("");
     setShowAIInput(false);
  };

  const handleCreateFile = () => {
    if (!workspacePath) return;
    setNewPromptName("");
    setNewPromptType("file");
  };

  const handleCreateFolder = () => {
    if (!workspacePath) return;
    setNewPromptName("");
    setNewPromptType("folder");
  };

  const submitNewPrompt = async () => {
    if (!workspacePath || !newPromptName.trim() || !newPromptType) return;
    const electronAPI = (window as any).electronAPI;
    const fullPath = `${workspacePath}\\${newPromptName.trim()}`;
    
    if (newPromptType === "file" && electronAPI?.codeStudio?.fsWrite) {
      await electronAPI.codeStudio.fsWrite(fullPath, "");
      useCodeStudioStore.getState().loadFileTree();
      useCodeStudioStore.getState().openFile(fullPath, newPromptName.trim());
    } else if (newPromptType === "folder" && electronAPI?.codeStudio?.fsMkdir) {
      await electronAPI.codeStudio.fsMkdir(fullPath);
      useCodeStudioStore.getState().loadFileTree();
    }
    
    setNewPromptType(null);
    setNewPromptName("");
  };

  return (
    <div className="flex h-full text-text-primary overflow-hidden">
      
      {/* ─── SIDEBAR (FILE TREE) ─── */}
      <div className={`shrink-0 h-full flex flex-col border-r border-border/40 bg-bg-secondary/30 ${activeFilePath ? 'hidden md:flex md:w-64' : 'flex w-full md:w-64'}`}>
        <div className="p-3 border-b border-border/40 flex items-center justify-between">
          <h2 className="text-[11px] font-extrabold uppercase tracking-widest text-text-tertiary">
            Explorer
          </h2>
          <div className="flex items-center gap-1">
            <button 
              onClick={handleCreateFile}
              className="w-6 h-6 flex items-center justify-center rounded text-text-tertiary hover:bg-bg-hover hover:text-text-primary transition-colors cursor-pointer"
              title="New File"
            >
              <FileCode size={13} />
            </button>
            <button 
              onClick={handleCreateFolder}
              className="w-6 h-6 flex items-center justify-center rounded text-text-tertiary hover:bg-bg-hover hover:text-text-primary transition-colors cursor-pointer"
              title="New Folder"
            >
              <Folder size={13} />
            </button>
            <button 
              onClick={handleOpenFolder}
              className="w-6 h-6 ml-1 flex items-center justify-center rounded bg-accent/20 text-accent hover:bg-accent hover:text-white transition-colors cursor-pointer"
              title="Open Workspace"
            >
              <FolderOpen size={13} />
            </button>
          </div>
        </div>
        
        {newPromptType && (
          <div className="px-3 py-2 border-b border-border/40 bg-bg-primary">
            <div className="flex items-center gap-1.5 px-2 py-1 bg-bg-secondary rounded border border-border">
              {newPromptType === "file" ? <FileCode size={12} className="text-text-tertiary" /> : <Folder size={12} className="text-text-tertiary" />}
              <input 
                ref={newPromptInputRef}
                value={newPromptName}
                onChange={e => setNewPromptName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") submitNewPrompt();
                  if (e.key === "Escape") setNewPromptType(null);
                }}
                onBlur={() => { if (!newPromptName) setNewPromptType(null); }}
                placeholder={newPromptType === "file" ? "filename.ext" : "folder_name"}
                className="flex-1 bg-transparent border-none outline-none text-[12px] text-text-primary placeholder:text-text-tertiary"
              />
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto py-2">
          {fileTree.length > 0 ? (
            fileTree.map(node => <FileTreeNode key={node.path} node={node} />)
          ) : (
            <div className="px-4 py-8 text-center flex flex-col items-center">
              <Code2 size={28} className="text-text-tertiary/50 mb-3" />
              <p className="text-[12px] text-text-tertiary mb-4">No workspace loaded</p>
              <button 
                onClick={handleOpenFolder}
                className="px-3 py-1.5 rounded-lg bg-accent text-white font-bold text-[11.5px] cursor-pointer"
              >
                Open Folder
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ─── EDITOR AND TERMINAL AREA ─── */}
      <div className={`flex-1 flex flex-col bg-bg-primary h-full min-w-0 ${!activeFilePath ? 'hidden md:flex' : 'flex'}`}>
        
        {/* Top Tabs */}
        {openFiles.length > 0 && (
          <div className="flex items-center overflow-x-auto border-b border-border/40 bg-bg-secondary/40 select-none scrollbar-hide">
            <button
              onClick={() => setActiveFile(null)}
              className="md:hidden flex shrink-0 items-center justify-center h-full px-3 py-2 border-r border-border/40 text-text-tertiary hover:text-text-primary"
            >
              <ChevronLeft size={16} />
            </button>
            {openFiles.map(file => {
              const isActive = file.path === activeFilePath;
              return (
                <div
                  key={file.path}
                  onClick={() => setActiveFile(file.path)}
                  className={`flex items-center gap-2 px-3 py-2 border-r border-border/40 cursor-pointer min-w-fit transition-colors
                    ${isActive ? 'bg-bg-primary border-t-2 border-t-accent text-text-primary' : 'bg-transparent border-t-2 border-t-transparent text-text-tertiary hover:bg-bg-hover'}
                  `}
                >
                  <FileCode size={12} className={isActive ? "text-accent" : ""} />
                  <span className="text-[12px] font-medium tracking-wide">
                    {file.name}
                  </span>
                  {file.isDirty && <span className="w-2 h-2 rounded-full bg-accent ml-1" title="Unsaved changes" />}
                  <button 
                    onClick={(e) => { e.stopPropagation(); closeFile(file.path); }}
                    className="ml-1 opacity-0 hover:opacity-100 hover:bg-border/50 rounded-md p-0.5 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        )}


        {/* Toolbar */}
        {workspacePath && (
          <div className="flex items-center justify-between px-4 py-2 border-b border-border/40 bg-bg-secondary/20">
          <div className="flex items-center gap-1.5 overflow-hidden">
             {activeFile && (
               <div className="flex items-center gap-2 px-2 py-1 rounded bg-bg-hover/50 text-[11px] text-text-tertiary">
                 <FileCode size={12} />
                 <span className="truncate max-w-[200px]">{activeFile.path}</span>
               </div>
             )}
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            <button 
              onClick={() => {
                setShowTerminal(true);
                appendTerminalOutput(`\n[Running Project...] npm run dev\n`);
                const electronAPI = (window as any).electronAPI;
                if (electronAPI?.codeStudio?.fsRun && workspacePath) {
                  electronAPI.codeStudio.fsRun("npm", ["run", "dev"], workspacePath).then((res: any) => {
                    if (res.runId) {
                      electronAPI.codeStudio.onFsRunData(res.runId, (data: string) => appendTerminalOutput(data));
                    }
                  });
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-success/10 text-success text-[11px] font-bold hover:bg-success/20 transition-all cursor-pointer"
            >
              <Play size={12} fill="currentColor" /> Run
            </button>
            <button 
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer bg-accent/10 text-accent hover:bg-accent/20"
              onClick={() => {
                const electronAPI = (window as any).electronAPI;
                if (electronAPI?.codeStudio?.openPreviewWindow) {
                  let url = "http://localhost:5173";
                  if (activeFile?.path.endsWith(".html")) {
                    url = `file://${activeFile.path.replace(/\\/g, '/')}`;
                  }
                  electronAPI.codeStudio.openPreviewWindow(url);
                }
              }}
            >
              <Globe size={12} /> Open Preview Window
            </button>
            <div className="w-px h-4 bg-border/40 mx-1" />
            <button className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-hover cursor-pointer" title="Git Commit">
              <GitBranch size={14} />
            </button>
            <button className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-hover cursor-pointer" title="Format Document">
               <RotateCw size={14} />
            </button>
          </div>
        </div>
        )}

        {/* Editor & Preview Instance */}
        <div className="flex-1 relative flex overflow-hidden">
          {/* Main Editor */}
          <div className="flex-1 relative pb-6">
            {activeFile ? (
              <div className="absolute inset-0 pt-2">
                <Editor
                  height="100%"
                  language={activeFile.language}
                  theme={themeResolved === "light" ? "vs" : "vs-dark"}
                  value={activeFile.content}
                  onChange={(val) => updateFileContent(activeFile.path, val || "")}
                  onMount={(editor, monaco) => {
                    // Register ! → HTML boilerplate snippet for html files
                    monaco.languages.registerCompletionItemProvider("html", {
                      triggerCharacters: ["!"],
                      provideCompletionItems: (model: any, position: any) => {
                        const word = model.getWordUntilPosition(position);
                        const range = {
                          startLineNumber: position.lineNumber,
                          startColumn: word.startColumn,
                          endLineNumber: position.lineNumber,
                          endColumn: word.endColumn,
                        };
                        return {
                          suggestions: [{
                            label: "! — HTML5 Boilerplate",
                            kind: monaco.languages.CompletionItemKind.Snippet,
                            insertText: [
                              '<!DOCTYPE html>',
                              '<html lang="en">',
                              '<head>',
                              '  <meta charset="UTF-8">',
                              '  <meta name="viewport" content="width=device-width, initial-scale=1.0">',
                              '  <title>${1:Document}</title>',
                              '  <style>',
                              '    body { margin: 0; font-family: system-ui, sans-serif; }',
                              '  </style>',
                              '</head>',
                              '<body>',
                              '  ${2}',
                              '</body>',
                              '</html>'
                            ].join('\n'),
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                            documentation: "Full HTML5 boilerplate template",
                            range,
                          }],
                        };
                      },
                    });
                  }}
                  options={{
                    minimap: { enabled: true, scale: 2, showSlider: "mouseover" },
                    fontSize: 13,
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    fontLigatures: true,
                    lineHeight: 1.6,
                    smoothScrolling: true,
                    cursorBlinking: "smooth",
                    cursorSmoothCaretAnimation: "on",
                    formatOnPaste: true,
                    formatOnType: true,
                    scrollBeyondLastLine: false,
                    autoClosingBrackets: "always",
                    autoClosingQuotes: "always",
                    autoClosingOvertype: "always",
                    autoSurround: "languageDefined",
                    bracketPairColorization: { enabled: true, independentColorPoolPerBracketType: true },
                    guides: { bracketPairs: true, indentation: true },
                    wordWrap: "on",
                    suggest: { showSnippets: true, snippetsPreventQuickSuggestions: false },
                    tabCompletion: "on",
                    quickSuggestions: { other: true, comments: false, strings: true },
                    parameterHints: { enabled: true },
                    renderWhitespace: "selection",
                    matchBrackets: "always",
                  }}
                />
              </div>
            ) : (
              <div className="flex h-full items-center justify-center flex-col text-text-tertiary font-medium">
                <Folder size={48} className="mb-4 opacity-20" />
                <p className="text-[14px]">Select a file from the explorer to begin editing.</p>
                <p className="text-[12px] mt-2 opacity-50">Press <kbd className="bg-border py-0.5 px-1.5 rounded">Ctrl</kbd> + <kbd className="bg-border py-0.5 px-1.5 rounded">Q</kbd> to launch AI Agent</p>
              </div>
            )}
          </div>

          {/* Status Bar */}
          {activeFile && (
            <div className="absolute bottom-0 left-0 right-0 h-6 bg-bg-secondary border-t border-border/40 flex items-center justify-between px-3 z-10 text-[10px] text-text-tertiary font-mono">
              <div className="flex items-center gap-3">
                <span className="capitalize">{activeFile.language}</span>
                <span>UTF-8</span>
                <span>Spaces: 2</span>
              </div>
              <div className="flex items-center gap-3">
                <span>{activeFile.content.split('\n').length} lines</span>
                <span>{activeFile.content.length} bytes</span>
              </div>
            </div>
          )}

          {/* AI Floating Input inside Editor Area */}
          <AnimatePresence>
            {showAIInput && (
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, pointerEvents: "none" }}
                className="absolute top-4 left-1/2 -translate-x-1/2 w-full max-w-[600px] z-50
                  bg-bg-primary/95 backdrop-blur-3xl border border-border/50 
                  shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] rounded-2xl overflow-hidden p-1.5"
              >
                <div className="flex items-center gap-2 relative z-10 px-2 py-1">
                  <div className="w-7 h-7 rounded-xl bg-accent/20 flex items-center justify-center text-accent shrink-0">
                    <Sparkles size={14} />
                  </div>
                  <input
                    ref={aiInputRef}
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    onKeyDown={(e) => {
                       if (e.key === 'Esc' || e.key === 'Escape') setShowAIInput(false);
                       if (e.key === 'Enter') executeCodingAgent();
                    }}
                    placeholder={workspacePath ? "Instruct agent to build, refactor, or command..." : "Open a workspace first..."}
                    className="flex-1 bg-transparent border-none outline-none text-[14px] 
                      text-text-primary placeholder:text-text-tertiary font-medium py-2"
                    disabled={isAiStreaming || !workspacePath}
                  />
                  <button
                    onClick={executeCodingAgent}
                    disabled={!aiInput.trim() || isAiStreaming || !workspacePath}
                    className="w-8 h-8 flex items-center justify-center rounded-xl bg-accent text-white 
                      disabled:opacity-50 disabled:bg-bg-secondary disabled:text-text-tertiary transition-all"
                  >
                    {isAiStreaming ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ─── TERMINAL PANEL ─── */}
        <AnimatePresence>
          {showTerminal && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "35%", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-border/40 bg-[#0c0c0c] flex flex-col font-mono"
            >
              <div className="flex items-center justify-between px-3 py-1.5 bg-black/40 border-b border-border/20">
                <div className="flex items-center gap-2 text-[11px] font-bold text-text-tertiary uppercase tracking-wider">
                  <TerminalSquare size={12} />
                  Terminal
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={clearTerminal} className="text-[10px] text-text-secondary hover:text-white px-2 py-0.5 rounded bg-white/5">Clear</button>
                  <button onClick={() => setShowTerminal(false)} className="text-text-tertiary hover:text-white"><X size={14} /></button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-3 text-[12px] text-[#A6ACCD] whitespace-pre-wrap break-all leading-relaxed">
                {terminalOutput || <span className="opacity-40">Integrated delay terminal ready. Run scripts here.</span>}
                <div ref={terminalEndRef} />
              </div>

              <form onSubmit={handleRunCommand} className="flex items-center gap-2 px-3 py-2 bg-black/20 border-t border-border/10">
                <span className="text-[#82AAFF] text-[12px] font-bold">~</span>
                <input 
                  type="text" 
                  value={terminalCmd}
                  onChange={e => setTerminalCmd(e.target.value)}
                  placeholder="npm run dev..."
                  className="flex-1 bg-transparent text-[12px] outline-none border-none text-[#A6ACCD] placeholder:opacity-30"
                />
              </form>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
