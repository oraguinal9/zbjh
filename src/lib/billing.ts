import { supabase } from "./supabase";
import { checkFreeLimit } from "./rate-limit";
import { NextRequest } from "next/server";

// 套餐定义
export const PACKAGES = {
  first: { amount: 9.9, words: 1_000_000, label: "首充特惠" },
  renew: { amount: 19.9, words: 1_000_000, label: "续费充值" },
} as const;

export type PackageType = keyof typeof PACKAGES;

/**
 * 获取用户剩余字数
 */
export async function getUserBalance(userId: string): Promise<number> {
  const { data } = await supabase
    .from("user_balances")
    .select("remaining_words")
    .eq("user_id", userId)
    .single();
  return data?.remaining_words ?? 0;
}

/**
 * 检查用户是否有足够余额
 * 如果没余额则返回 false，调用方应降级为免费次数检查
 */
export async function checkBalance(userId: string, minWords = 1): Promise<boolean> {
  const balance = await getUserBalance(userId);
  return balance >= minWords;
}

/**
 * 扣除AI生成的字数，记录消费
 * 仅在有余额时调用（已通过 checkBalance 校验）
 */
export async function deductWords(
  userId: string,
  words: number,
  feature: string,
  projectId?: string,
  chapterId?: string,
) {
  if (words <= 0) return;

  // 获取当前余额
  const { data: balance } = await supabase
    .from("user_balances")
    .select("remaining_words")
    .eq("user_id", userId)
    .single();

  const currentWords = balance?.remaining_words ?? 0;
  if (currentWords <= 0) return;

  const actualDeduct = Math.min(words, currentWords);

  // 更新余额
  await supabase
    .from("user_balances")
    .update({ remaining_words: currentWords - actualDeduct, updated_at: new Date().toISOString() })
    .eq("user_id", userId);

  // 记录消费
  await supabase.from("usage_records").insert({
    user_id: userId,
    words_used: actualDeduct,
    feature,
    project_id: projectId || null,
    chapter_id: chapterId || null,
  });
}

/**
 * 统计文本字数（去除空格）
 */
export function countTextWords(text: string): number {
  return text.replace(/\s/g, "").length;
}

/**
 * 包装流式响应，在流结束后扣除字数
 * stream 中的内容必须是纯文本（不含 SSE 帧）
 */
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

/**
 * 从请求中获取已付费用户ID
 * 付费用户走余额扣费，跳过免费次数限制
 * 返回 null 表示未付费或未登录
 */
export async function getPaidUser(req: NextRequest): Promise<string | null> {
  try {
    const { getCurrentUser } = await import("@/lib/supabase");
    const user = await getCurrentUser();
    if (!user) return null;
    const hasBalance = await checkBalance(user.id);
    return hasBalance ? user.id : null;
  } catch {
    return null;
  }
}

/**
 * 检查付费状态，余额为0时返回错误信息
 * 在 AI 路由中替代手动的 getPaidUser + checkFreeLimit 两步
 */
export async function checkQuotaOrError(req: NextRequest): Promise<{
  paidUserId: string | null;
  errorResponse?: Response;
}> {
  const paidUserId = await getPaidUser(req);
  if (paidUserId) return { paidUserId };

  // 已登录但余额为0 → 引导充值
  const { getCurrentUser } = await import("@/lib/supabase");
  const user = await getCurrentUser();
  if (user) {
    const balance = await getUserBalance(user.id);
    if (balance === 0) {
      return {
        paidUserId: null,
        errorResponse: Response.json(
          { error: "余额不足，请充值后续续使用AI功能", needRecharge: true },
          { status: 402 },
        ),
      };
    }
  }

  // 未付费 → 走免费次数
  const limit = await checkFreeLimit(req);
  if (!limit.allowed) {
    return {
      paidUserId: null,
      errorResponse: Response.json(
        { error: limit.error, needLogin: !user },
        { status: 429 },
      ),
    };
  }

  return { paidUserId: null };
}
