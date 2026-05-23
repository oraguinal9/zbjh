import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";

const FREE_ANON_LIMIT = 3;
const FREE_USER_LIMIT = 100;
const DATA_DIR = path.join(process.cwd(), ".rate-limit");

function getDataFile(label: string): string {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  const today = new Date().toISOString().slice(0, 10);
  return path.join(DATA_DIR, `${label}-${today}.json`);
}

function readCounts(label: string): Record<string, number> {
  try {
    return JSON.parse(fs.readFileSync(getDataFile(label), "utf-8"));
  } catch {
    return {};
  }
}

function writeCounts(label: string, counts: Record<string, number>) {
  const file = getDataFile(label);
  const tmp = file + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(counts));
  fs.renameSync(tmp, file);
}

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "127.0.0.1";
}

interface LimitResult {
  allowed: boolean;
  remaining: number;
  error?: string;
}

function getAnonKey(req: NextRequest): string {
  return getClientIp(req);
}

async function getUserKey(req: NextRequest): Promise<string | null> {
  try {
    const { getCurrentUser } = await import("@/lib/supabase");
    const user = await getCurrentUser();
    return user?.id || null;
  } catch {
    return null;
  }
}

export async function checkFreeLimit(req: NextRequest): Promise<LimitResult> {
  const userId = await getUserKey(req);
  if (userId) {
    const counts = readCounts("user");
    const current = counts[userId] || 0;
    if (current >= FREE_USER_LIMIT) {
      return { allowed: false, remaining: 0, error: `今日调用次数已达上限（${FREE_USER_LIMIT}次），明天再试。` };
    }
    return { allowed: true, remaining: FREE_USER_LIMIT - current };
  }

  const ip = getAnonKey(req);
  const counts = readCounts("anon");
  const current = counts[ip] || 0;
  if (current >= FREE_ANON_LIMIT) {
    return { allowed: false, remaining: 0, error: `今日免费次数已用完（${FREE_ANON_LIMIT}次）。请登录后继续使用。` };
  }
  return { allowed: true, remaining: FREE_ANON_LIMIT - current };
}

export async function incrementCount(req: NextRequest) {
  const userId = await getUserKey(req);
  if (userId) {
    const counts = readCounts("user");
    counts[userId] = (counts[userId] || 0) + 1;
    writeCounts("user", counts);
  } else {
    const ip = getAnonKey(req);
    const counts = readCounts("anon");
    counts[ip] = (counts[ip] || 0) + 1;
    writeCounts("anon", counts);
  }
}
