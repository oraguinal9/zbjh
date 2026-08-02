import { NextRequest } from "next/server";
import { exec, execSync } from "child_process";
import { createHmac, timingSafeEqual } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync, writeFileSync, unlinkSync } from "fs";

const SUPABASE_URL = "https://khgnjblnukxteyufvjym.supabase.co";
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  "sb_publishable_BQ91PYvokaGrK6UU6shFjQ_oO-BVsm9";

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "";
const LOCK_FILE = "/tmp/zbjh-deploy.lock";
const LOCK_MAX_AGE = 35 * 60 * 1000; // 锁最长有效 35 分钟

function verifySignature(payload: string, signature: string | null): boolean {
  if (!WEBHOOK_SECRET || !signature) return false;
  const sig = signature.startsWith("sha256=") ? signature.slice(7) : signature;
  const expected = createHmac("sha256", WEBHOOK_SECRET).update(payload).digest("hex");
  if (sig.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

async function writeDeployStatus(phase: string, detail: object) {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
    const { error } = await supabase.from("transactions").insert({
      project: "system",
      type: "deploy_ping",
      amount: 0,
      note: JSON.stringify({ phase, ...detail, at: new Date().toISOString() }),
    });
    console.log("[deploy status]", phase, error ? error.message : "ok");
  } catch (e) {
    console.error("[deploy status write failed]", (e as Error).message);
  }
}

function lockBusy(): boolean {
  try {
    if (!existsSync(LOCK_FILE)) return false;
    const ts = Number(readFileSync(LOCK_FILE, "utf8").trim());
    if (Date.now() - ts > LOCK_MAX_AGE) {
      unlinkSync(LOCK_FILE);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const event = req.headers.get("x-github-event") || "unknown";
  const signature = req.headers.get("x-hub-signature-256");
  const rawBody = await req.text();

  if (!verifySignature(rawBody, signature)) {
    return Response.json({ error: "签名验证失败" }, { status: 403 });
  }
  if (event === "ping") return Response.json({ message: "pong" });
  if (event !== "push") return Response.json({ message: `忽略 ${event} 事件` });

  let commit = "unknown";
  try {
    const payload = JSON.parse(rawBody);
    commit = payload.after || "unknown";
  } catch {}

  // 串行化：已有构建在跑则跳过本次，避免弱机 CPU 抢占导致全部超时
  if (lockBusy()) {
    await writeDeployStatus("skipped", { commit, reason: "build already running" });
    return Response.json({ success: true, skipped: true, message: "构建进行中，已跳过本次" });
  }

  // 先落库再返回，确保 GitHub 收到 200 即代表此行已写入
  await writeDeployStatus("triggered", { commit });
  writeFileSync(LOCK_FILE, String(Date.now()));

  const projectDir = process.cwd();

  // 近期均为纯 TS 改动（quota-center / version 端点），无新增依赖，跳过 npm install 以加速
  exec(
    `cd "${projectDir}" && git pull origin master 2>&1 && npm run build 2>&1`,
    { timeout: 2400000, maxBuffer: 20 * 1024 * 1024 },
    async (error, stdout) => {
      const ok = !error;
      await writeDeployStatus(ok ? "done" : "failed", {
        commit,
        error: error ? error.message.slice(0, 500) : null,
        tail: stdout ? stdout.slice(-800) : "",
      });
      try {
        if (existsSync(LOCK_FILE)) unlinkSync(LOCK_FILE);
      } catch {}
      // 写库完成后再重启
      if (ok) {
        exec("pm2 restart ai-writer", { timeout: 60000 }, () => {});
      }
    }
  );

  return Response.json({ success: true, message: "部署已触发", commit });
}
