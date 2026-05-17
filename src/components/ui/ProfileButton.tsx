import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { LogOut, Crown, Zap, Settings, ChevronRight, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useGamificationStore } from "@/stores/gamificationStore";
import { useNavigate } from "react-router-dom";
import { WorkspacesModal } from "@/features/workspaces/WorkspacesModal";

const PLAN_COLORS: Record<string, string> = {
  free: "text-text-tertiary bg-bg-hover",
  pro: "text-amber-400 bg-amber-400/10",
  max: "text-purple-400 bg-purple-400/10",
};

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  pro: "Pro",
  max: "Max",
};

interface Props {
  compact?: boolean;
  telegram?: boolean;
}

export function ProfileButton({ compact, telegram }: Props) {
  const { user, signOut } = useAuth();
  const { profile } = useProfile();
  const { xp, level } = useGamificationStore();
  const [open, setOpen] = useState(false);
  const [workspacesOpen, setWorkspacesOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Allow other parts of the app (Settings → Account) to open the
  // Workspaces modal without needing a global store.
  useEffect(() => {
    const open = () => setWorkspacesOpen(true);
    window.addEventListener("delay:open-workspaces", open);
    return () => window.removeEventListener("delay:open-workspaces", open);
  }, []);

  if (!user) return null;

  const name = profile?.display_name ?? user.email?.split("@")[0] ?? "User";
  const email = user.email ?? "";
  const avatarUrl = profile?.avatar_url;
  const plan = profile?.plan ?? "free";
  const initial = name.charAt(0).toUpperCase();

  const Avatar = () =>
    avatarUrl ? (
      <img
        src={avatarUrl}
        alt={name}
        className="w-full h-full rounded-full object-cover"
      />
    ) : (
      <span className="text-[11px] font-bold text-text-primary">{initial}</span>
    );

  if (telegram) {
    return (
      <div ref={ref} className="relative w-full">
        <button
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl transition-all duration-200 cursor-pointer hover:bg-bg-hover"
        >
          <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center shrink-0 overflow-hidden">
            <Avatar />
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-[12px] font-bold text-text-primary truncate">{name}</p>
            <p className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full w-fit ${PLAN_COLORS[plan]}`}>
              {PLAN_LABELS[plan]}
            </p>
          </div>
        </button>
        <DropdownMenu open={open} onClose={() => setOpen(false)} name={name} email={email} plan={plan} xp={xp} level={level} signOut={signOut} navigate={navigate}
          onOpenWorkspaces={() => { setWorkspacesOpen(true); setOpen(false); }} telegram />
        <WorkspacesModal open={workspacesOpen} onClose={() => setWorkspacesOpen(false)} />
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        title={name}
        className={`group relative flex items-center justify-center shrink-0 transition-all duration-200 cursor-pointer ${
          compact ? "w-[40px] h-[40px] rounded-lg" : "w-[44px] h-[44px] rounded-xl"
        } hover:bg-bg-hover`}
      >
        <div
          className={`flex items-center justify-center rounded-full bg-accent/20 overflow-hidden ${
            compact ? "w-7 h-7" : "w-8 h-8"
          }`}
        >
          <Avatar />
        </div>
        {plan !== "free" && (
          <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-amber-400 flex items-center justify-center">
            <Crown size={8} className="text-white" />
          </div>
        )}
      </button>
      <DropdownMenu open={open} onClose={() => setOpen(false)} name={name} email={email} plan={plan} xp={xp} level={level} signOut={signOut} navigate={navigate}
        onOpenWorkspaces={() => { setWorkspacesOpen(true); setOpen(false); }} />
      <WorkspacesModal open={workspacesOpen} onClose={() => setWorkspacesOpen(false)} />
    </div>
  );
}

function DropdownMenu({
  open, onClose, name, email, plan, xp, level, signOut, navigate, onOpenWorkspaces, telegram,
}: {
  open: boolean; onClose: () => void; name: string; email: string; plan: string;
  xp: number; level: number; signOut: () => void; navigate: (to: string) => void;
  onOpenWorkspaces: () => void; telegram?: boolean;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -6, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.97 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className={`absolute z-[200] w-[220px] bg-bg-elevated/98 backdrop-blur-2xl border border-border/40 rounded-2xl shadow-2xl overflow-hidden
            ${telegram ? "bottom-full left-0 mb-2" : "bottom-full left-full ml-3 mb-0"}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-4 pt-4 pb-3 border-b border-border/20">
            <p className="text-[13px] font-bold text-text-primary truncate">{name}</p>
            <p className="text-[10px] text-text-tertiary truncate">{email}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${PLAN_COLORS[plan]}`}>
                {PLAN_LABELS[plan]}
              </span>
              <span className="text-[10px] text-text-tertiary flex items-center gap-1">
                <Zap size={10} className="text-accent" />
                Lv.{level} · {xp} XP
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="p-1.5 space-y-0.5">
            {plan === "free" && (
              <button
                onClick={() => { navigate("/pricing"); onClose(); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-gradient-to-r from-amber-400/10 to-purple-400/10 hover:from-amber-400/20 hover:to-purple-400/20 transition-all cursor-pointer"
              >
                <Crown size={14} className="text-amber-400" />
                <span className="text-[12px] font-bold text-amber-400 flex-1">Upgrade to Pro</span>
                <ChevronRight size={12} className="text-amber-400/60" />
              </button>
            )}
            <button
              onClick={() => { onOpenWorkspaces(); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-bg-hover transition-all cursor-pointer"
            >
              <Users size={14} className="text-text-tertiary" />
              <span className="text-[12px] font-medium text-text-secondary flex-1 text-left">Workspaces</span>
              <ChevronRight size={12} className="text-text-tertiary" />
            </button>
            <button
              onClick={() => { navigate("/settings"); onClose(); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-bg-hover transition-all cursor-pointer"
            >
              <Settings size={14} className="text-text-tertiary" />
              <span className="text-[12px] font-medium text-text-secondary">Settings</span>
            </button>
            <button
              onClick={() => { signOut(); onClose(); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-danger/10 transition-all cursor-pointer"
            >
              <LogOut size={14} className="text-danger" />
              <span className="text-[12px] font-medium text-danger">Sign Out</span>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
