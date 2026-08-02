// 统一额度中台 - 会员（跨项目通用）

import { supabase } from "@/lib/supabase";
import { TIERS, type TierKey } from "./config";
import type { Membership } from "./types";

// 取当前生效的会员（过期返回 null）
export async function getActiveMembership(userId: string): Promise<Membership | null> {
  const { data } = await supabase
    .from("memberships")
    .select("tier, expires_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return null;
  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) return null;
  return { tier: data.tier as TierKey, expiresAt: data.expires_at };
}

export async function isMember(userId: string): Promise<boolean> {
  return (await getActiveMembership(userId)) !== null;
}

// 发放 / 续费会员（每个用户仅保留一条生效记录）
export async function grantMembership(userId: string, tier: TierKey): Promise<void> {
  const days = TIERS[tier].days;
  const expiresAt = days ? new Date(Date.now() + days * 86400000).toISOString() : null;
  await supabase.from("memberships").upsert(
    {
      user_id: userId,
      tier,
      started_at: new Date().toISOString(),
      expires_at: expiresAt,
    },
    { onConflict: "user_id" },
  );
}
