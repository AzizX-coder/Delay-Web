import { useState, useEffect, useRef } from "react";
import { useBucketStore } from "@/stores/bucketStore";
import { motion, AnimatePresence } from "motion/react";
import {
  FolderPlus, Upload, Trash2, FileText, Image as ImageIcon,
  Archive, Download, Search, X, Folder, ChevronLeft, MoreVertical,
  Edit3, Film, Music, File, Share2, Shield, Eye,
} from "lucide-react";
import { EmptyState } from "@/shared/components/EmptyState";

interface BucketFile { id: string; name: string; fileData: string; fileType: string; size: number; created_at: number; folderId: string | null; }

function FilePreviewModal({ file, onClose }: { file: BucketFile; onClose: () => void }) {
  const isImage = file.fileType.startsWith("image/");
  const isVideo = file.fileType.startsWith("video/");
  const isAudio = file.fileType.startsWith("audio/");
  const isPDF = file.fileType.includes("pdf");
  const isText = file.fileType.startsWith("text/");

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.94, opacity: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 28 }}
          className="relative max-w-4xl w-full max-h-[85vh] bg-bg-elevated rounded-3xl overflow-hidden shadow-2xl border border-border/40"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/20 bg-bg-secondary/30">
            <p className="text-[13px] font-bold text-text-primary truncate">{file.name}</p>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl text-text-tertiary hover:text-text-primary hover:bg-bg-hover cursor-pointer"><X size={16} /></button>
          </div>
          {/* Content */}
          <div className="flex items-center justify-center overflow-auto" style={{ maxHeight: "calc(85vh - 56px)" }}>
            {isImage && <img src={file.fileData} alt={file.name} className="max-w-full max-h-full object-contain" />}
            {isVideo && <video src={file.fileData} controls className="max-w-full max-h-full" />}
            {isAudio && <div className="p-8"><audio src={file.fileData} controls className="w-[320px]" /></div>}
            {isPDF && <embed src={file.fileData} type="application/pdf" className="w-full" style={{ height: "70vh" }} />}
            {isText && (
              <pre className="p-6 text-[12px] text-text-secondary font-mono overflow-auto w-full max-h-[70vh] whitespace-pre-wrap">
                {atob(file.fileData.split(",")[1] ?? "")}
              </pre>
            )}
            {!isImage && !isVideo && !isAudio && !isPDF && !isText && (
              <div className="p-12 text-center">
                <File size={48} className="text-text-tertiary mx-auto mb-3" />
                <p className="text-text-secondary text-[14px] font-medium">{file.name}</p>
                <p className="text-text-tertiary text-[12px] mt-1">Preview not available for this file type.</p>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

const formatSize = (bytes: number) => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
};

const getFileIcon = (type: string) => {
  if (type.startsWith("image/")) return <ImageIcon size={18} className="text-accent" />;
  if (type.startsWith("video/")) return <Film size={18} className="text-warning" />;
  if (type.startsWith("audio/")) return <Music size={18} className="text-success" />;
  if (type.includes("pdf")) return <FileText size={18} className="text-danger" />;
  return <File size={18} className="text-text-tertiary" />;
};

export function BucketPage() {
  const { files, folders, loading, loadVault, addFolder, renameFolder, removeFolder, addFile, removeFile, moveFile } = useBucketStore();
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [previewFile, setPreviewFile] = useState<BucketFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadVault(); }, []);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList) return;
    Array.from(fileList).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        addFile({
          name: file.name,
          folderId: activeFolderId,
          fileData: reader.result as string,
          fileType: file.type,
          size: file.size,
        });
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const downloadFile = (file: { fileData: string; name: string }) => {
    const a = document.createElement("a");
    a.href = file.fileData;
    a.download = file.name;
    a.click();
  };

  const shareFile = async (file: { fileData: string; name: string; fileType: string }) => {
    try {
      if (navigator.share) {
        const res = await fetch(file.fileData);
        const blob = await res.blob();
        const f = new window.File([blob], file.name, { type: file.fileType });
        await navigator.share({ files: [f], title: file.name });
      }
    } catch {}
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    addFolder(newFolderName.trim());
    setNewFolderName("");
    setShowNewFolder(false);
  };

  const activeFolder = folders.find(f => f.id === activeFolderId);
  const currentFiles = files.filter(f => f.folderId === activeFolderId);
  const rootFiles = files.filter(f => f.folderId === null);
  const displayFiles = activeFolderId ? currentFiles : rootFiles;
  const filtered = search
    ? displayFiles.filter(f => f.name.toLowerCase().includes(search.toLowerCase()))
    : displayFiles;

  return (
    <div className="flex flex-col h-full bg-bg-primary">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 md:px-6 py-3 border-b border-border/30 bg-bg-secondary/30 backdrop-blur-md shrink-0">
        {activeFolderId && (
          <button onClick={() => setActiveFolderId(null)} className="p-1.5 rounded-lg bg-bg-hover text-text-secondary hover:text-text-primary cursor-pointer">
            <ChevronLeft size={16} />
          </button>
        )}
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: activeFolder ? activeFolder.color + "20" : "rgba(99,102,241,0.1)" }}>
          {activeFolder ? <Folder size={18} style={{ color: activeFolder.color }} /> : <Archive size={18} className="text-accent" />}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-[15px] font-bold text-text-primary truncate">{activeFolder ? activeFolder.name : "Vault"}</h1>
          <p className="text-[10px] text-text-tertiary">
            {activeFolder ? `${currentFiles.length} files` : `${folders.length} folders · ${rootFiles.length} files`}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="hidden md:flex items-center gap-1 px-2 py-1.5 rounded-lg bg-bg-primary border border-border/30">
            <Search size={13} className="text-text-tertiary" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="bg-transparent outline-none text-[12px] text-text-primary w-[120px]" />
          </div>
          <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-lg bg-accent text-white cursor-pointer hover:bg-accent/90" title="Upload Files">
            <Upload size={16} />
          </button>
        </div>
      </div>

      <input type="file" ref={fileInputRef} onChange={handleUpload} multiple className="hidden" />

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {loading ? (
          <div className="flex items-center justify-center h-full text-text-tertiary text-[12px]">Loading...</div>
        ) : (
          <>
            {/* Folders grid (only in root view) */}
            {!activeFolderId && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[11px] font-extrabold text-text-tertiary uppercase tracking-widest">Folders</h3>
                  <button onClick={() => setShowNewFolder(true)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-accent bg-accent/10 cursor-pointer hover:bg-accent/15">
                    <FolderPlus size={13} /> New
                  </button>
                </div>

                <AnimatePresence>
                  {showNewFolder && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-3 overflow-hidden">
                      <div className="flex items-center gap-2">
                        <input value={newFolderName} onChange={e => setNewFolderName(e.target.value)} onKeyDown={e => e.key === "Enter" && handleCreateFolder()} placeholder="Folder name..." autoFocus
                          className="flex-1 px-3 py-2 rounded-lg bg-bg-secondary border border-border/30 text-[13px] text-text-primary outline-none focus:border-accent" />
                        <button onClick={handleCreateFolder} className="px-3 py-2 rounded-lg bg-accent text-white text-[12px] font-bold cursor-pointer">Create</button>
                        <button onClick={() => setShowNewFolder(false)} className="p-2 text-text-tertiary cursor-pointer"><X size={14} /></button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {folders.map(folder => (
                    <motion.div key={folder.id} whileHover={{ y: -2 }} onClick={() => setActiveFolderId(folder.id)}
                      className="group flex items-center gap-3 p-3 rounded-xl border border-border/20 bg-bg-secondary/40 hover:border-border/40 cursor-pointer transition-all">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: folder.color + "15" }}>
                        <Folder size={20} style={{ color: folder.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        {editingFolderId === folder.id ? (
                          <input value={editName} onChange={e => setEditName(e.target.value)} autoFocus
                            onBlur={() => { renameFolder(folder.id, editName); setEditingFolderId(null); }}
                            onKeyDown={e => { if (e.key === "Enter") { renameFolder(folder.id, editName); setEditingFolderId(null); } }}
                            onClick={e => e.stopPropagation()}
                            className="bg-transparent outline-none text-[13px] font-bold text-text-primary w-full border-b border-accent" />
                        ) : (
                          <p className="text-[13px] font-bold text-text-primary truncate">{folder.name}</p>
                        )}
                        <p className="text-[10px] text-text-tertiary">{files.filter(f => f.folderId === folder.id).length} files</p>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5">
                        <button onClick={e => { e.stopPropagation(); setEditingFolderId(folder.id); setEditName(folder.name); }} className="p-1 text-text-tertiary hover:text-accent cursor-pointer"><Edit3 size={12} /></button>
                        <button onClick={e => { e.stopPropagation(); removeFolder(folder.id); }} className="p-1 text-text-tertiary hover:text-danger cursor-pointer"><Trash2 size={12} /></button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Files list */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[11px] font-extrabold text-text-tertiary uppercase tracking-widest flex items-center gap-2">
                  <Shield size={11} /> Files {activeFolderId && <span className="text-accent font-mono">({filtered.length})</span>}
                </h3>
              </div>
              {filtered.length === 0 ? (
                <EmptyState type="vault" title={activeFolderId ? "Empty folder" : "No files"} description="Upload files to keep them safe in your Vault." />
              ) : (
                <div className="space-y-1.5">
                  {filtered.map(file => (
                    <motion.div key={file.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      className="group flex items-center gap-3 p-3 rounded-xl border border-border/20 bg-bg-secondary/30 hover:border-border/40 transition-all cursor-pointer"
                      onClick={() => setPreviewFile(file as BucketFile)}>
                      {/* Thumbnail or icon */}
                      <div className="w-10 h-10 rounded-lg bg-bg-hover flex items-center justify-center shrink-0 overflow-hidden">
                        {file.fileType.startsWith("image/") ? (
                          <img src={file.fileData} alt="" className="w-full h-full object-cover" />
                        ) : (
                          getFileIcon(file.fileType)
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-bold text-text-primary truncate">{file.name}</p>
                        <p className="text-[10px] text-text-tertiary">{formatSize(file.size)} · {new Date(file.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 shrink-0">
                        {'share' in navigator && (
                          <button onClick={() => shareFile(file)} className="p-1.5 rounded-lg text-text-tertiary hover:text-accent cursor-pointer" title="Share"><Share2 size={13} /></button>
                        )}
                        <button onClick={() => downloadFile(file)} className="p-1.5 rounded-lg text-text-tertiary hover:text-accent cursor-pointer" title="Download"><Download size={13} /></button>
                        <button onClick={(e) => { e.stopPropagation(); removeFile(file.id); }} className="p-1.5 rounded-lg text-text-tertiary hover:text-danger cursor-pointer" title="Delete"><Trash2 size={13} /></button>
                        <button onClick={(e) => { e.stopPropagation(); setPreviewFile(file as BucketFile); }} className="p-1.5 rounded-lg text-text-tertiary hover:text-accent cursor-pointer" title="Preview"><Eye size={13} /></button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {previewFile && <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />}
    </div>
  );
}
