// 统一额度中台 - 每日免费额度（DB 支持，跨项目 / Serverless 安全）
// 替代原 rate-limit.ts 的文件存储方案（多实例下会失效，且原版只 check 不 increment）

import { supabase } from "@/lib/supabase";
import type { NextRequest } from "next/server";
import { PROJECTS } from "./config";

export function getClientIp(req: NextRequest): string {
  const f = req.headers.get("x-forwarded-for");
  return f ? f.split(",")[0].trim() : "127.0.0.1";
}

// 额度主体：登录用户用 user_id，匿名用户用 anon:<ip>
export function subjectOf(req: NextRequest, userId: string | null): string {
  return userId ?? `anon:${getClientIp(req)}`;
}

export function dailyLimitFor(project: string, anon: boolean): number {
  const cfg = (PROJECTS as Record<string, any>)[project]?.dailyFree ?? PROJECTS.default.dailyFree;
  return anon ? cfg.anon : cfg.user;
}

export interface DailyCheck {
  allowed: boolean;
  remaining: number;
  error?: string;
}

// 原子地“检查 + 累加”当日免费次数，返回是否放行及剩余次数
export async function checkAndIncrementDaily(subject: string, project: string): Promise<DailyCheck> {
  const anon = subject.startsWith("anon:");
  const limit = dailyLimitFor(project, anon);
  const { data, error } = await supabase.rpc("check_and_incr_daily", {
    p_subject: subject,
    p_project: project,
    p_date: new Date().toISOString().slice(0, 10),
    p_limit: limit,
  });
  if (error) {
    return { allowed: false, remaining: 0, error: "额度服务异常，请稍后再试" };
  }
  const d = data as DailyCheck;
  return { allowed: d.allowed, remaining: d.remaining ?? 0 };
}
