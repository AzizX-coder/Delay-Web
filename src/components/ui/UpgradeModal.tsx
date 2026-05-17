import { motion, AnimatePresence } from "motion/react";
import { X, Crown, Zap, Check, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PRO_FEATURES = [
  "Unlimited notes, tasks & flows",
  "Cloud sync across all devices",
  "Public note sharing",
  "Cloud Vault (5GB storage)",
  "500 AI credits per month",
  "Priority support",
];

const MAX_FEATURES = [
  "Everything in Pro",
  "20GB cloud Vault",
  "Unlimited AI credits",
  "Team collaboration (coming soon)",
];

interface Props {
  open: boolean;
  onClose: () => void;
  feature?: string;
  reason?: string;
}

export function UpgradeModal({ open, onClose, feature, reason }: Props) {
  const navigate = useNavigate();

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 20 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="fixed z-[301] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
              w-[min(520px,calc(100vw-24px))] bg-bg-elevated/98 backdrop-blur-2xl
              border border-border/40 rounded-3xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="relative px-6 pt-6 pb-4 text-center bg-gradient-to-br from-amber-400/8 to-purple-400/8 border-b border-border/20">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-xl text-text-tertiary hover:text-text-primary hover:bg-bg-hover transition-all cursor-pointer"
              >
                <X size={15} />
              </button>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400/20 to-purple-400/20 flex items-center justify-center mx-auto mb-3">
                <Lock size={22} className="text-amber-400" />
              </div>
              <h2 className="text-[18px] font-extrabold text-text-primary">
                {feature ? `Upgrade to use ${feature}` : "Upgrade to Delay Pro"}
              </h2>
              {reason && (
                <p className="text-[12px] text-text-tertiary mt-1">{reason}</p>
              )}
            </div>

            {/* Plan cards */}
            <div className="p-5 grid grid-cols-2 gap-3">
              {/* Pro */}
              <div className="rounded-2xl border border-amber-400/30 bg-amber-400/5 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Crown size={14} className="text-amber-400" />
                  <span className="text-[13px] font-bold text-amber-400">Pro</span>
                </div>
                <p className="text-[24px] font-black text-text-primary mb-3">
                  $8<span className="text-[13px] font-medium text-text-tertiary">/mo</span>
                </p>
                <ul className="space-y-1.5">
                  {PRO_FEATURES.map((f) => (
                    <li key={f} className="flex items-start gap-1.5 text-[11px] text-text-secondary">
                      <Check size={10} className="text-amber-400 mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Max */}
              <div className="rounded-2xl border border-purple-400/30 bg-purple-400/5 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Zap size={14} className="text-purple-400" />
                  <span className="text-[13px] font-bold text-purple-400">Max</span>
                </div>
                <p className="text-[24px] font-black text-text-primary mb-3">
                  $18<span className="text-[13px] font-medium text-text-tertiary">/mo</span>
                </p>
                <ul className="space-y-1.5">
                  {MAX_FEATURES.map((f) => (
                    <li key={f} className="flex items-start gap-1.5 text-[11px] text-text-secondary">
                      <Check size={10} className="text-purple-400 mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* CTA */}
            <div className="px-5 pb-5 space-y-2">
              <button
                onClick={() => { navigate("/pricing"); onClose(); }}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-white font-bold text-[14px] cursor-pointer hover:opacity-90 transition-all shadow-lg"
              >
                See Pricing & Upgrade
              </button>
              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-xl text-text-tertiary text-[12px] hover:text-text-secondary cursor-pointer transition-all"
              >
                Maybe later
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
