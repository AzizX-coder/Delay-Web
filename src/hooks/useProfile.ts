import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./useAuth";

export type Plan = "free" | "pro" | "max";

export interface Profile {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  plan: Plan;
  xp: number;
  level: number;
  streak_days: number;
  streak_last_date: string | null;
  stripe_customer_id: string | null;
  subscription_id: string | null;
  subscription_status: string | null;
  subscription_period_end: string | null;
  ai_credits: number;
  weekly_insight: string | null;
  weekly_insight_date: string | null;
  onboarding_complete: boolean;
}

function emptyProfile(user: { id: string; email?: string; user_metadata?: Record<string, any> } | null): Profile | null {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email ?? null,
    display_name: user.user_metadata?.full_name ?? (user.email ? user.email.split("@")[0] : null),
    avatar_url: user.user_metadata?.avatar_url ?? null,
    plan: "free",
    xp: 0,
    level: 1,
    streak_days: 0,
    streak_last_date: null,
    stripe_customer_id: null,
    subscription_id: null,
    subscription_status: null,
    subscription_period_end: null,
    ai_credits: 0,
    weekly_insight: null,
    weekly_insight_date: null,
    onboarding_complete: false,
  };
}

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    if (!supabase) {
      setProfile(emptyProfile(user));
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const { data, error } = await supabase!
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (cancelled) return;

        if (error && (error as any).code !== "PGRST116") {
          setProfile(emptyProfile(user));
          setLoading(false);
          return;
        }

        if (!data) {
          const seed = emptyProfile(user)!;
          const { data: inserted } = await supabase!
            .from("profiles")
            .insert({
              id: seed.id,
              email: seed.email,
              display_name: seed.display_name,
              avatar_url: seed.avatar_url,
            })
            .select()
            .maybeSingle();
          if (!cancelled) {
            setProfile((inserted as Profile) ?? seed);
            setLoading(false);
          }
          return;
        }

        setProfile(data as Profile);
        setLoading(false);
      } catch {
        if (!cancelled) {
          setProfile(emptyProfile(user));
          setLoading(false);
        }
      }
    })();

    const channel = supabase
      .channel(`profile:${user.id}`)
      .on(
        "postgres_changes" as any,
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${user.id}` },
        (payload: any) => {
          if (!cancelled && payload?.new) setProfile(payload.new as Profile);
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase?.removeChannel(channel);
    };
  }, [user?.id]);

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return;
    setProfile((p) => (p ? { ...p, ...updates } : p));
    if (!supabase) return;
    await supabase.from("profiles").update(updates).eq("id", user.id);
  };

  return { profile, loading, updateProfile };
}
