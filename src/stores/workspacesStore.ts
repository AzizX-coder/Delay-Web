import { create } from "zustand";
import { supabase } from "@/lib/supabase";

/**
 * Collaboration store — workspaces, members, invites.
 * Backed entirely by Supabase (mirrors the workspaces / workspace_members /
 * workspace_invites tables in supabase/schema.sql). Every action is a no-op
 * when Supabase isn't configured or the user is in local-only mode, so the
 * UI can render a "sign in to collaborate" state without crashing.
 */

export interface Workspace {
  id: string;
  owner_id: string;
  name: string;
  color: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  workspace_id: string;
  user_id: string;
  role: "owner" | "editor" | "viewer";
  invited_by: string | null;
  joined_at: string;
}

export interface WorkspaceInvite {
  id: string;
  workspace_id: string;
  email: string;
  role: "editor" | "viewer";
  token: string;
  invited_by: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

const ACTIVE_KEY = "delay_active_workspace";

interface WorkspacesState {
  workspaces: Workspace[];
  members: WorkspaceMember[];      // members of activeWorkspaceId
  invites: WorkspaceInvite[];      // pending invites for activeWorkspaceId
  activeWorkspaceId: string | null;
  loading: boolean;
  error: string | null;

  loadWorkspaces: () => Promise<void>;
  setActiveWorkspace: (id: string | null) => void;
  createWorkspace: (name: string) => Promise<string | null>;
  renameWorkspace: (id: string, name: string) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;

  loadMembersAndInvites: (workspaceId: string) => Promise<void>;
  inviteMember: (workspaceId: string, email: string, role: "editor" | "viewer") => Promise<void>;
  revokeInvite: (inviteId: string) => Promise<void>;
  removeMember: (workspaceId: string, userId: string) => Promise<void>;
  acceptInvite: (token: string) => Promise<string | null>;
}

async function currentUserId(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export const useWorkspacesStore = create<WorkspacesState>((set, get) => ({
  workspaces: [],
  members: [],
  invites: [],
  activeWorkspaceId: (() => {
    try { return localStorage.getItem(ACTIVE_KEY); } catch { return null; }
  })(),
  loading: false,
  error: null,

  loadWorkspaces: async () => {
    if (!supabase) return;
    set({ loading: true, error: null });
    const { data, error } = await supabase
      .from("workspaces")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) {
      set({ loading: false, error: error.message });
      return;
    }
    const workspaces = (data ?? []) as Workspace[];
    // Keep the active workspace valid; fall back to the first one.
    let active = get().activeWorkspaceId;
    if (active && !workspaces.some(w => w.id === active)) active = null;
    if (!active && workspaces.length > 0) active = workspaces[0].id;
    set({ workspaces, activeWorkspaceId: active, loading: false });
    try {
      if (active) localStorage.setItem(ACTIVE_KEY, active);
      else localStorage.removeItem(ACTIVE_KEY);
    } catch {}
    if (active) get().loadMembersAndInvites(active);
  },

  setActiveWorkspace: (id) => {
    set({ activeWorkspaceId: id, members: [], invites: [] });
    try {
      if (id) localStorage.setItem(ACTIVE_KEY, id);
      else localStorage.removeItem(ACTIVE_KEY);
    } catch {}
    if (id) get().loadMembersAndInvites(id);
  },

  createWorkspace: async (name) => {
    if (!supabase) return null;
    const uid = await currentUserId();
    if (!uid) return null;
    const { data, error } = await supabase
      .from("workspaces")
      .insert({ owner_id: uid, name: name.trim() || "Untitled Workspace" })
      .select()
      .single();
    if (error || !data) {
      set({ error: error?.message ?? "Could not create workspace" });
      return null;
    }
    // The owner is added as a member so RLS membership checks pass.
    await supabase.from("workspace_members").insert({
      workspace_id: data.id, user_id: uid, role: "owner",
    });
    set(s => ({ workspaces: [...s.workspaces, data as Workspace] }));
    get().setActiveWorkspace(data.id);
    return data.id;
  },

  renameWorkspace: async (id, name) => {
    if (!supabase) return;
    set(s => ({ workspaces: s.workspaces.map(w => w.id === id ? { ...w, name } : w) }));
    await supabase.from("workspaces").update({ name }).eq("id", id);
  },

  deleteWorkspace: async (id) => {
    if (!supabase) return;
    await supabase.from("workspaces").delete().eq("id", id);
    set(s => {
      const workspaces = s.workspaces.filter(w => w.id !== id);
      const wasActive = s.activeWorkspaceId === id;
      return {
        workspaces,
        activeWorkspaceId: wasActive ? (workspaces[0]?.id ?? null) : s.activeWorkspaceId,
        members: wasActive ? [] : s.members,
        invites: wasActive ? [] : s.invites,
      };
    });
    const next = get().activeWorkspaceId;
    try {
      if (next) localStorage.setItem(ACTIVE_KEY, next);
      else localStorage.removeItem(ACTIVE_KEY);
    } catch {}
    if (next) get().loadMembersAndInvites(next);
  },

  loadMembersAndInvites: async (workspaceId) => {
    if (!supabase) return;
    const [m, i] = await Promise.all([
      supabase.from("workspace_members").select("*").eq("workspace_id", workspaceId),
      supabase.from("workspace_invites").select("*").eq("workspace_id", workspaceId).is("accepted_at", null),
    ]);
    set({
      members: (m.data ?? []) as WorkspaceMember[],
      invites: (i.data ?? []) as WorkspaceInvite[],
    });
  },

  inviteMember: async (workspaceId, email, role) => {
    if (!supabase) return;
    const uid = await currentUserId();
    if (!uid) return;
    const { data, error } = await supabase
      .from("workspace_invites")
      .insert({ workspace_id: workspaceId, email: email.trim().toLowerCase(), role, invited_by: uid })
      .select()
      .single();
    if (error) {
      set({ error: error.message });
      return;
    }
    if (data) set(s => ({ invites: [...s.invites, data as WorkspaceInvite], error: null }));
  },

  revokeInvite: async (inviteId) => {
    if (!supabase) return;
    set(s => ({ invites: s.invites.filter(i => i.id !== inviteId) }));
    await supabase.from("workspace_invites").delete().eq("id", inviteId);
  },

  removeMember: async (workspaceId, userId) => {
    if (!supabase) return;
    set(s => ({ members: s.members.filter(m => m.user_id !== userId) }));
    await supabase.from("workspace_members").delete()
      .eq("workspace_id", workspaceId).eq("user_id", userId);
  },

  acceptInvite: async (token) => {
    if (!supabase) return null;
    const { data, error } = await supabase.rpc("accept_workspace_invite", { invite_token: token });
    if (error) {
      set({ error: error.message });
      return null;
    }
    await get().loadWorkspaces();
    if (data) get().setActiveWorkspace(data as string);
    return (data as string) ?? null;
  },
}));
