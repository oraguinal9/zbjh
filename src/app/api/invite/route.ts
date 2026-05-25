import { NextRequest } from "next/server";
import { supabase, getCurrentUser } from "@/lib/supabase";

const REWARDS = {
  signup_bonus: 100_000,      // 注册双方各得 10万字
  referral_bonus: 200_000,    // 被邀请人首次充值，邀请人得 20万字
};

// 生成8位随机邀请码
function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * GET /api/invite - 获取当前用户的邀请信息
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "未登录" }, { status: 401 });

    // 确保有 profile
    let { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!profile) {
      // 首次访问，自动创建 profile + 生成邀请码
      let code = generateCode();
      // 确保唯一
      for (let i = 0; i < 10; i++) {
        const { data: existing } = await supabase
          .from("profiles")
          .select("id")
          .eq("invite_code", code)
          .single();
        if (!existing) break;
        code = generateCode();
      }
      const { data: newProfile } = await supabase
        .from("profiles")
        .insert({ id: user.id, invite_code: code })
        .select()
        .single();
      profile = newProfile;
    }

    // 统计邀请人数
    const { count: totalInvites } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("invited_by", user.id);

    // 统计总奖励
    const { data: rewards } = await supabase
      .from("invite_rewards")
      .select("amount_words")
      .eq("user_id", user.id);

    const totalRewards = (rewards || []).reduce((sum, r) => sum + r.amount_words, 0);

    // 最近奖励记录
    const { data: recentRewards } = await supabase
      .from("invite_rewards")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    return Response.json({
      invite_code: profile.invite_code,
      invite_link: `https://www.zbjh.top/login?invite=${profile.invite_code}`,
      total_invites: totalInvites || 0,
      total_rewards: totalRewards,
      rewards: (recentRewards || []).map((r: any) => ({
        words: r.amount_words,
        reason: r.reason,
        created_at: r.created_at,
      })),
    });
  } catch (error: any) {
    console.error("[邀请信息]", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/invite - 应用邀请码
 * Body: { code: "ABC12345" }
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "未登录" }, { status: 401 });

    const { code } = await req.json();
    if (!code || typeof code !== "string") {
      return Response.json({ error: "请输入邀请码" }, { status: 400 });
    }

    const upperCode = code.toUpperCase().trim();

    // 查自己有没有 profile
    let { data: myProfile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    // 已绑定过邀请人
    if (myProfile?.invited_by) {
      return Response.json({ error: "你已经绑定过邀请码了" }, { status: 400 });
    }

    // 查邀请码是否存在
    const { data: inviter } = await supabase
      .from("profiles")
      .select("id, invite_code")
      .eq("invite_code", upperCode)
      .single();

    if (!inviter) {
      return Response.json({ error: "邀请码无效" }, { status: 404 });
    }

    // 不能邀请自己
    if (inviter.id === user.id) {
      return Response.json({ error: "不能使用自己的邀请码" }, { status: 400 });
    }

    // 创建或更新 profile
    if (!myProfile) {
      let myCode = generateCode();
      for (let i = 0; i < 10; i++) {
        const { data: existing } = await supabase
          .from("profiles")
          .select("id")
          .eq("invite_code", myCode)
          .single();
        if (!existing) break;
        myCode = generateCode();
      }
      await supabase.from("profiles").insert({
        id: user.id,
        invite_code: myCode,
        invited_by: inviter.id,
      });
    } else {
      await supabase
        .from("profiles")
        .update({ invited_by: inviter.id })
        .eq("id", user.id);
    }

    // 奖励双方：注册各得 10万字
    const signupWords = REWARDS.signup_bonus;

    // 给新用户加额度
    await addWords(user.id, signupWords);
    await supabase.from("invite_rewards").insert({
      user_id: user.id,
      amount_words: signupWords,
      reason: "signup_bonus",
      related_user_id: inviter.id,
    });

    // 给邀请人加额度
    await addWords(inviter.id, signupWords);
    await supabase.from("invite_rewards").insert({
      user_id: inviter.id,
      amount_words: signupWords,
      reason: "referral_bonus",
      related_user_id: user.id,
    });

    return Response.json({
      success: true,
      message: "邀请码绑定成功！你和邀请人各获得 10 万字额度。",
      words_added: signupWords,
    });
  } catch (error: any) {
    console.error("[邀请码绑定]", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// 给用户增加额度（user_balances 表）
async function addWords(userId: string, words: number) {
  const { data: balance } = await supabase
    .from("user_balances")
    .select("remaining_words, total_purchased_words")
    .eq("user_id", userId)
    .single();

  if (balance) {
    await supabase
      .from("user_balances")
      .update({
        remaining_words: (balance.remaining_words || 0) + words,
        total_purchased_words: (balance.total_purchased_words || 0) + words,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);
  } else {
    await supabase.from("user_balances").insert({
      user_id: userId,
      remaining_words: words,
      total_purchased_words: words,
    });
  }
}
