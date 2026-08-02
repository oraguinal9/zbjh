// 统一额度中台 - 核心配额逻辑
// 优先级：会员(免费) > 已购字数余额(扣费) > 每日免费次数 > 引导充值/登录
// 与旧 billing.ts 行为一致，但每日次数改为 DB 原子累加，并新增跨项目会员。

import { supabase, getCurrentUser } from "@/lib/supabase";
import type { NextRequest } from "next/server";
import { isMember } from "./membership";
import { subjectOf, checkAndIncrementDaily } from "./daily";
import type { QuotaResult } from "./types";

export function countTextWords(text: string): number {
  return text.replace(/\s/g, "").length;
}

export async function getUserBalance(userId: string): Promise<number> {
  const { data } = await supabase
    .from("user_balances")
    .select("remaining_words")
    .eq("user_id", userId)
    .single();
  return data?.remaining_words ?? 0;
}

export async function checkBalance(userId: string, minWords = 1): Promise<boolean> {
  return (await getUserBalance(userId)) >= minWords;
}

export async function deductWords(
  userId: string,
  words: number,
  feature: string,
  projectId?: string,
  chapterId?: string,
) {
  if (words <= 0) return;

  const { data: balance } = await supabase
    .from("user_balances")
    .select("remaining_words")
    .eq("user_id", userId)
    .single();

  const currentWords = balance?.remaining_words ?? 0;
  if (currentWords <= 0) return;

  const actualDeduct = Math.min(words, currentWords);

  await supabase
    .from("user_balances")
    .update({ remaining_words: currentWords - actualDeduct, updated_at: new Date().toISOString() })
    .eq("user_id", userId);

  await supabase.from("usage_records").insert({
    user_id: userId,
    words_used: actualDeduct,
    feature,
    project_id: projectId || null,
    chapter_id: chapterId || null,
  });
}

export function withBillingStream(
  stream: ReadableStream<Uint8Array>,
  userId: string,
  feature: string,
): ReadableStream<Uint8Array> {
  let totalChars = 0;

  const reader = stream.getReader();
  return new ReadableStream({
    async pull(controller) {
      try {
        const { done, value } = await reader.read();
        if (done) {
          controller.close();
          if (totalChars > 0) {
            deductWords(userId, totalChars, feature);
          }
          return;
        }
        const text = new TextDecoder().decode(value);
        totalChars += countTextWords(text);
        controller.enqueue(value);
      } catch (e) {
        controller.error(e);
      }
    },
    cancel() {
      reader.cancel();
    },
  });
}

export async function getPaidUser(req: NextRequest): Promise<string | null> {
  try {
    const user = await getCurrentUser();
    if (!user) return null;
    const hasBalance = await checkBalance(user.id);
    return hasBalance ? user.id : null;
  } catch {
    return null;
  }
}

export async function checkQuotaOrError(
  req: NextRequest,
  project = "zbjh",
): Promise<QuotaResult> {
  const user = await getCurrentUser();

  // 1. 会员：全站免费额度，优先放行（不扣字数）
  if (user && (await isMember(user.id))) {
    return { paidUserId: null, isMember: true };
  }

  // 2. 已购字数余额：走扣费
  if (user && (await checkBalance(user.id))) {
    return { paidUserId: user.id };
  }

  // 3. 每日免费次数（DB 原子累加）
  const subject = subjectOf(req, user?.id ?? null);
  const res = await checkAndIncrementDaily(subject, project);
  if (res.allowed) {
    return { paidUserId: null };
  }

  // 4. 免费次数用尽
  if (user) {
    return {
      paidUserId: null,
      errorResponse: Response.json(
        { error: "免费次数已用完，开通会员或充值后畅享无限写作", needRecharge: true },
        { status: 402 },
      ),
    };
  }

  return {
    paidUserId: null,
    errorResponse: Response.json(
      { error: res.error ?? "请登录后继续使用", needLogin: true },
      { status: 429 },
    ),
  };
}
