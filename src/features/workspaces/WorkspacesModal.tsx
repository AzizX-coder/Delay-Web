import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X, Plus, Users, Crown, Trash2, Mail, Check, Ticket, Loader2, Cloud,
} from "lucide-react";
import { useWorkspacesStore } from "@/stores/workspacesStore";
import { useAuth } from "@/hooks/useAuth";
import { isSupabaseConfigured } from "@/lib/supabase";

export function WorkspacesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm" onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            role="dialog" aria-label="Workspaces"
            className="fixed z-[201] left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2
              w-[min(720px,calc(100vw-24px))] h-[min(560px,calc(100vh-80px))]
              bg-bg-elevated border border-border/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
          >
            <header className="flex items-center justify-between px-5 py-4 border-b border-border/30 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-accent/12 ring-1 ring-accent/25 flex items-center justify-center">
                  <Users size={16} className="text-accent" />
                </div>
                <div>
                  <p className="text-[14px] font-bold text-text-primary leading-tight">Workspaces</p>
                  <p className="text-[10.5px] text-text-tertiary">Share notes, tasks & boards with your team</p>
                </div>
              </div>
              <button onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-text-tertiary hover:bg-bg-hover cursor-pointer">
                <X size={16} />
              </button>
            </header>

            {isSupabaseConfigured ? <WorkspacesBody /> : <NotConfigured />}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function NotConfigured() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
      <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mb-4">
        <Cloud size={26} className="text-accent" />
      </div>
      <p className="text-[15px] font-bold text-text-primary">Sign in to collaborate</p>
      <p className="text-[12.5px] text-text-tertiary max-w-xs mt-1.5">
        Workspaces live in the cloud. Switch to a cloud account in Settings to
        create a workspace and invite your team.
      </p>
    </div>
  );
}

function WorkspacesBody() {
  const { user } = useAuth();
  const {
    workspaces, members, invites, activeWorkspaceId, loading, error,
    loadWorkspaces, setActiveWorkspace, createWorkspace, renameWorkspace,
    deleteWorkspace, inviteMember, revokeInvite, removeMember, acceptInvite,
  } = useWorkspacesStore();

  const [newName, setNewName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"editor" | "viewer">("editor");
  const [inviteToken, setInviteToken] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { loadWorkspaces(); }, []);

  const active = workspaces.find(w => w.id === activeWorkspaceId) ?? null;
  const isOwner = !!active && !!user && active.owner_id === user.id;

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setBusy(true);
    await createWorkspace(newName);
    setNewName("");
    setBusy(false);
  };

  const handleInvite = async () => {
    if (!active || !inviteEmail.trim()) return;
    setBusy(true);
    await inviteMember(active.id, inviteEmail, inviteRole);
    setInviteEmail("");
    setBusy(false);
  };

  const handleAccept = async () => {
    if (!inviteToken.trim()) return;
    setBusy(true);
    const ws = await acceptInvite(inviteToken.trim());
    if (ws) setInviteToken("");
    setBusy(false);
  };

  return (
    <div className="flex-1 flex min-h-0">
      {/* ── Workspace list ── */}
      <aside className="w-[220px] border-r border-border/30 flex flex-col shrink-0">
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loading && workspaces.length === 0 ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 size={18} className="text-text-tertiary animate-spin" />
            </div>
          ) : workspaces.length === 0 ? (
            <p className="text-[11.5px] text-text-tertiary text-center py-8 px-3">
              No workspaces yet. Create one below.
            </p>
          ) : (
            workspaces.map(w => (
              <button key={w.id} onClick={() => setActiveWorkspace(w.id)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition-colors cursor-pointer
                  ${activeWorkspaceId === w.id ? "bg-accent/10 ring-1 ring-accent/20" : "hover:bg-bg-hover"}`}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-[12px] font-bold"
                  style={{ background: `${w.color ?? "#6E62F5"}1f`, color: w.color ?? "#6E62F5" }}>
                  {w.name.charAt(0).toUpperCase()}
                </div>
                <span className={`text-[12.5px] font-semibold truncate flex-1 ${activeWorkspaceId === w.id ? "text-accent" : "text-text-primary"}`}>
                  {w.name}
                </span>
                {user && w.owner_id === user.id && <Crown size={11} className="text-amber-400 shrink-0" />}
              </button>
            ))
          )}
        </div>
        <div className="p-2 border-t border-border/20">
          <div className="flex items-center gap-1.5">
            <input
              value={newName} onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleCreate(); }}
              placeholder="New workspace"
              className="flex-1 min-w-0 bg-bg-secondary border border-border/30 rounded-lg px-2.5 py-1.5 text-[12px] text-text-primary outline-none placeholder:text-text-tertiary"
            />
            <button onClick={handleCreate} disabled={busy || !newName.trim()}
              className="w-8 h-8 shrink-0 rounded-lg bg-accent text-white flex items-center justify-center hover:opacity-90 disabled:opacity-40 cursor-pointer">
              <Plus size={15} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Active workspace detail ── */}
      <section className="flex-1 overflow-y-auto p-5 min-w-0">
        {error && (
          <div className="mb-4 px-3 py-2 rounded-xl bg-danger/10 border border-danger/20 text-danger text-[11.5px]">
            {error}
          </div>
        )}

        {!active ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <Users size={28} className="text-text-tertiary mb-3" />
            <p className="text-[13.5px] font-bold text-text-primary">Pick or create a workspace</p>
            <p className="text-[11.5px] text-text-tertiary mt-1 max-w-[260px]">
              A workspace lets your team share notes, tasks, boards and events.
            </p>
            <div className="mt-5 w-full max-w-[280px]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary mb-2">Have an invite link?</p>
              <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-1.5 flex-1 bg-bg-secondary border border-border/30 rounded-lg px-2.5 py-1.5">
                  <Ticket size={13} className="text-text-tertiary shrink-0" />
                  <input value={inviteToken} onChange={e => setInviteToken(e.target.value)}
                    placeholder="Paste invite token"
                    className="flex-1 min-w-0 bg-transparent text-[12px] text-text-primary outline-none placeholder:text-text-tertiary" />
                </div>
                <button onClick={handleAccept} disabled={busy || !inviteToken.trim()}
                  className="px-3 h-8 rounded-lg bg-accent text-white text-[12px] font-bold hover:opacity-90 disabled:opacity-40 cursor-pointer">
                  Join
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Workspace name */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 text-[16px] font-bold"
                style={{ background: `${active.color ?? "#6E62F5"}26`, color: active.color ?? "#6E62F5" }}>
                {active.name.charAt(0).toUpperCase()}
              </div>
              <input
                value={active.name}
                onChange={e => renameWorkspace(active.id, e.target.value)}
                disabled={!isOwner}
                className="flex-1 bg-transparent outline-none text-[18px] font-extrabold text-text-primary tracking-tight disabled:opacity-100"
              />
              {isOwner && (
                <button onClick={() => deleteWorkspace(active.id)}
                  className="w-9 h-9 flex items-center justify-center rounded-xl text-text-tertiary hover:text-danger hover:bg-danger/10 cursor-pointer"
                  title="Delete workspace">
                  <Trash2 size={15} />
                </button>
              )}
            </div>

            {/* Members */}
            <p className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary mb-2">
              Members · {members.length}
            </p>
            <div className="space-y-1 mb-5">
              {members.map(m => (
                <div key={m.user_id} className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-bg-secondary/50">
                  <div className="w-7 h-7 rounded-full bg-accent/15 flex items-center justify-center shrink-0">
                    <span className="text-[11px] font-bold text-accent">{m.role === "owner" ? "★" : "U"}</span>
                  </div>
                  <span className="flex-1 text-[12px] text-text-primary truncate">
                    {user && m.user_id === user.id ? "You" : `${m.user_id.slice(0, 8)}…`}
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-bg-hover text-text-tertiary capitalize">
                    {m.role}
                  </span>
                  {isOwner && m.role !== "owner" && (
                    <button onClick={() => removeMember(active.id, m.user_id)}
                      className="text-text-tertiary hover:text-danger cursor-pointer" title="Remove">
                      <X size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Pending invites */}
            {invites.length > 0 && (
              <>
                <p className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary mb-2">
                  Pending invites · {invites.length}
                </p>
                <div className="space-y-1 mb-5">
                  {invites.map(inv => (
                    <div key={inv.id} className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-bg-secondary/50">
                      <Mail size={13} className="text-text-tertiary shrink-0" />
                      <span className="flex-1 text-[12px] text-text-primary truncate">{inv.email}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-bg-hover text-text-tertiary capitalize">
                        {inv.role}
                      </span>
                      <button
                        onClick={() => navigator.clipboard?.writeText(inv.token).catch(() => {})}
                        className="text-[10px] font-bold text-accent hover:underline cursor-pointer" title="Copy invite token">
                        Copy token
                      </button>
                      {isOwner && (
                        <button onClick={() => revokeInvite(inv.id)}
                          className="text-text-tertiary hover:text-danger cursor-pointer" title="Revoke">
                          <X size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Invite form (owner only) */}
            {isOwner && (
              <div className="rounded-2xl border border-border/30 bg-bg-secondary/40 p-3">
                <p className="text-[11.5px] font-bold text-text-primary mb-2 flex items-center gap-1.5">
                  <Plus size={12} /> Invite someone
                </p>
                <div className="flex items-center gap-1.5">
                  <input
                    value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") handleInvite(); }}
                    type="email" placeholder="teammate@email.com"
                    className="flex-1 min-w-0 bg-bg-primary border border-border/30 rounded-lg px-2.5 py-1.5 text-[12px] text-text-primary outline-none placeholder:text-text-tertiary"
                  />
                  <select value={inviteRole} onChange={e => setInviteRole(e.target.value as "editor" | "viewer")}
                    className="bg-bg-primary border border-border/30 rounded-lg px-2 py-1.5 text-[12px] text-text-primary outline-none cursor-pointer">
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                  </select>
                  <button onClick={handleInvite} disabled={busy || !inviteEmail.trim()}
                    className="px-3 h-8 rounded-lg bg-accent text-white text-[12px] font-bold hover:opacity-90 disabled:opacity-40 cursor-pointer flex items-center gap-1">
                    {busy ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                    Invite
                  </button>
                </div>
                <p className="text-[10.5px] text-text-tertiary mt-2">
                  They get an invite token to paste here on their account to join.
                </p>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
