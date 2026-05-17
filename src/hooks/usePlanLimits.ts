import { useProfile } from "./useProfile";

// Keep in sync with the `plans` table in supabase/schema.sql.
export const PLAN_LIMITS = {
  free: {
    priceMonthly: 0,
    priceYearly: 0,
    maxNotes: 50,
    maxBoards: 3,
    maxFlows: 10,
    maxVaultMB: 0,
    canShare: false,
    canCloudSync: false,
    canUseCloudVault: false,
    canCollaborate: false,
    maxWorkspaceMembers: 1,
    aiCreditsPerMonth: 20,
  },
  pro: {
    priceMonthly: 12,
    priceYearly: 120,
    maxNotes: Infinity,
    maxBoards: Infinity,
    maxFlows: Infinity,
    maxVaultMB: 5000,
    canShare: true,
    canCloudSync: true,
    canUseCloudVault: true,
    canCollaborate: true,
    maxWorkspaceMembers: 3,
    aiCreditsPerMonth: 500,
  },
  max: {
    priceMonthly: 29,
    priceYearly: 290,
    maxNotes: Infinity,
    maxBoards: Infinity,
    maxFlows: Infinity,
    maxVaultMB: 20000,
    canShare: true,
    canCloudSync: true,
    canUseCloudVault: true,
    canCollaborate: true,
    maxWorkspaceMembers: 10,
    aiCreditsPerMonth: Infinity,
  },
} as const;

export type PlanKey = keyof typeof PLAN_LIMITS;

export function usePlanLimits() {
  const { profile } = useProfile();
  const plan = (profile?.plan ?? "free") as PlanKey;
  const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
  const isProOrAbove = plan === "pro" || plan === "max";

  return {
    plan,
    limits,
    isProOrAbove,
    isFree: plan === "free",
  };
}
