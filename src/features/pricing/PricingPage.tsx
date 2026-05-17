import { motion } from "motion/react";
import { Check, Crown, Zap, Sparkles, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useProfile } from "@/hooks/useProfile";

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    note: "",
    icon: <Sparkles size={20} className="text-text-tertiary" />,
    color: "border-border/30",
    badge: "",
    features: [
      "Up to 50 notes",
      "Up to 3 Kanban boards",
      "Local storage only",
      "20 AI messages / month",
      "All themes & customization",
      "Cmd+K command palette",
      "Pomodoro timer & gamification",
    ],
    cta: "Current plan",
    ctaStyle: "bg-bg-hover text-text-secondary cursor-default",
  },
  {
    id: "pro",
    name: "Pro",
    price: "$12",
    period: "/ month",
    note: "or $120 / year — save 17%",
    icon: <Crown size={20} className="text-amber-400" />,
    color: "border-amber-400/40 ring-1 ring-amber-400/20",
    badge: "Most Popular",
    features: [
      "Unlimited notes, tasks, boards & flows",
      "Cloud sync across all your devices",
      "Real-time collaboration — up to 3 people",
      "Public note sharing with links",
      "5 GB encrypted Cloud Vault",
      "500 AI credits / month",
      "Priority support",
    ],
    cta: "Upgrade to Pro",
    ctaStyle: "bg-gradient-to-r from-amber-400 to-amber-500 text-white hover:opacity-90 shadow-lg shadow-amber-400/20",
  },
  {
    id: "max",
    name: "Max",
    price: "$29",
    period: "/ month",
    note: "or $290 / year — save 17%",
    icon: <Zap size={20} className="text-purple-400" />,
    color: "border-purple-400/40",
    badge: "",
    features: [
      "Everything in Pro",
      "Team workspaces — up to 10 people",
      "20 GB encrypted Cloud Vault",
      "Unlimited AI credits",
      "Advanced AI models",
      "Early access to new features",
      "Dedicated support",
    ],
    cta: "Upgrade to Max",
    ctaStyle: "bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:opacity-90 shadow-lg shadow-purple-400/20",
  },
] as const;

export function PricingPage() {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const currentPlan = profile?.plan ?? "free";

  const handleUpgrade = (planId: string) => {
    if (planId === "free" || planId === currentPlan) return;
    // TODO: Wire to Stripe checkout when VITE_STRIPE_PUBLISHABLE_KEY is set
    // For now, show a coming-soon notice
    alert("Stripe payments coming soon! Your account will be upgraded automatically once billing is enabled.");
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 md:py-12">
        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[12px] text-text-tertiary hover:text-text-secondary mb-8 cursor-pointer transition-colors"
        >
          <ArrowLeft size={14} />
          Back
        </button>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <h1 className="text-[32px] md:text-[40px] font-black text-text-primary mb-3">
            Simple, transparent pricing
          </h1>
          <p className="text-[15px] text-text-tertiary max-w-md mx-auto">
            Start free. Upgrade when you need more power. Cancel anytime.
          </p>
        </motion.div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className={`relative rounded-3xl border ${plan.color} bg-bg-secondary/40 p-6 flex flex-col`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-amber-400 text-white text-[10px] font-extrabold shadow-md">
                  {plan.badge}
                </div>
              )}

              {/* Plan header */}
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 rounded-xl bg-bg-hover flex items-center justify-center">
                  {plan.icon}
                </div>
                <div>
                  <p className="text-[14px] font-bold text-text-primary">{plan.name}</p>
                  {currentPlan === plan.id && (
                    <span className="text-[9px] font-bold text-accent bg-accent/10 px-1.5 py-0.5 rounded-full">
                      Current
                    </span>
                  )}
                </div>
              </div>

              {/* Price */}
              <div className="mb-5">
                <div>
                  <span className="text-[36px] font-black text-text-primary">{plan.price}</span>
                  <span className="text-[13px] text-text-tertiary ml-1">{plan.period}</span>
                </div>
                {plan.note && (
                  <p className="text-[11px] text-text-tertiary mt-1">{plan.note}</p>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-2 mb-6 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-[12px] text-text-secondary">
                    <Check size={13} className="text-success mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <button
                onClick={() => handleUpgrade(plan.id)}
                disabled={plan.id === "free" || currentPlan === plan.id}
                className={`w-full py-3 rounded-xl font-bold text-[13px] transition-all cursor-pointer ${plan.ctaStyle}`}
              >
                {currentPlan === plan.id && plan.id !== "free" ? "Current Plan" : plan.cta}
              </button>
            </motion.div>
          ))}
        </div>

        {/* FAQ / Guarantee */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-12 text-center"
        >
          <p className="text-[12px] text-text-tertiary">
            All plans include a <strong className="text-text-secondary">30-day money-back guarantee</strong>.
            No questions asked.
          </p>
          <p className="text-[11px] text-text-tertiary mt-2">
            Questions? Contact us at{" "}
            <a href="mailto:support@delay.app" className="text-accent hover:underline">
              support@delay.app
            </a>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
