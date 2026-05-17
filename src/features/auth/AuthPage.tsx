import { useState } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { motion } from "motion/react";
import { Logo } from "@/components/ui/Logo";
import { Globe, Laptop, Mail, Eye, EyeOff, ArrowRight, AlertCircle } from "lucide-react";

type Mode = "signin" | "signup";

export function AuthPage({ onSkip }: { onSkip?: () => void }) {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOAuth = async (provider: "google" | "github") => {
    if (!supabase) return;
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin },
    });
    if (error) setError(error.message);
    setLoading(false);
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !email || !password) return;
    setLoading(true);
    setError(null);

    const { error } = mode === "signin"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });

    if (error) setError(error.message);
    setLoading(false);
  };

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-bg-primary p-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-md">
          <Logo size={48} />
          <h1 className="text-[24px] font-bold text-text-primary mt-6 mb-3">Welcome to Delay</h1>
          <p className="text-[14px] text-text-tertiary mb-6">
            Cloud sync is not configured. You can use Delay in offline mode, or set up Supabase for cloud features.
          </p>
          {onSkip && (
            <button onClick={onSkip}
              className="px-6 py-3 rounded-xl bg-accent text-white font-bold text-[14px] cursor-pointer hover:bg-accent/90 transition-all flex items-center gap-2 mx-auto">
              Continue Offline <ArrowRight size={16} />
            </button>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary relative overflow-hidden p-6">
      {/* Background decorations */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-accent/5 blur-3xl" />
        <div className="absolute bottom-[-100px] right-[-100px] w-[400px] h-[400px] rounded-full bg-accent/3 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="relative z-10 w-full max-w-[400px] bg-bg-secondary/60 backdrop-blur-2xl border border-border/30 rounded-3xl p-8 shadow-2xl"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <Logo size={48} />
          <h1 className="text-[22px] font-bold text-text-primary mt-4">
            {mode === "signin" ? "Sign in to Delay" : "Create your account"}
          </h1>
          <p className="text-[13px] text-text-tertiary mt-1">Your second brain for deep work</p>
        </div>

        {/* Error */}
        {error && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 px-4 py-3 mb-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-[12px]">
            <AlertCircle size={14} />
            {error}
          </motion.div>
        )}

        {/* OAuth */}
        <div className="space-y-2.5 mb-5">
          <button onClick={() => handleOAuth("google")} disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-white text-gray-800 font-bold text-[14px] cursor-pointer hover:bg-gray-50 transition-all disabled:opacity-50 border border-gray-200">
            <Globe size={18} />
            Continue with Google
          </button>
          <button onClick={() => handleOAuth("github")} disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-[#24292e] text-white font-bold text-[14px] cursor-pointer hover:bg-[#2f363d] transition-all disabled:opacity-50">
            <Laptop size={18} />
            Continue with GitHub
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-border/30" />
          <span className="text-[11px] text-text-tertiary font-bold uppercase tracking-wider">or</span>
          <div className="flex-1 h-px bg-border/30" />
        </div>

        {/* Email form */}
        <form onSubmit={handleEmail} className="space-y-3">
          <div>
            <label className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider mb-1.5 block">Email</label>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-bg-primary border border-border/30 focus-within:border-accent/40 transition-colors">
              <Mail size={16} className="text-text-tertiary shrink-0" />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"
                className="flex-1 bg-transparent outline-none text-[14px] text-text-primary placeholder:text-text-tertiary" />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider mb-1.5 block">Password</label>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-bg-primary border border-border/30 focus-within:border-accent/40 transition-colors">
              <input type={showPass ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                className="flex-1 bg-transparent outline-none text-[14px] text-text-primary placeholder:text-text-tertiary" />
              <button type="button" onClick={() => setShowPass(!showPass)} className="text-text-tertiary cursor-pointer">
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading || !email || !password}
            className="w-full py-3 rounded-xl bg-accent text-white font-bold text-[14px] cursor-pointer hover:bg-accent/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2">
            {loading ? "Loading..." : mode === "signin" ? "Sign In" : "Create Account"}
          </button>
        </form>

        {/* Toggle mode */}
        <p className="text-center text-[12px] text-text-tertiary mt-5">
          {mode === "signin" ? "Don't have an account?" : "Already have an account?"}{" "}
          <button onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null); }}
            className="text-accent font-bold cursor-pointer hover:underline">
            {mode === "signin" ? "Sign up" : "Sign in"}
          </button>
        </p>

        {/* Skip button for offline use */}
        {onSkip && (
          <button onClick={onSkip}
            className="w-full mt-4 py-2.5 rounded-xl text-[12px] font-bold text-text-tertiary hover:text-text-secondary cursor-pointer transition-colors">
            Skip — Use offline
          </button>
        )}
      </motion.div>
    </div>
  );
}
