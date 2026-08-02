import { NextRequest } from "next/server";
import { exec } from "child_process";
import { createHmac, timingSafeEqual } from "crypto";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://khgnjblnukxteyufvjym.supabase.co";
// 服务端若未配置 service_role，则回落到已验证可用的 anon publishable key（配合宽松 RLS）
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  "sb_publishable_BQ91PYvokaGrK6UU6shFjQ_oO-BVsm9";

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "";

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

export async function POST(req: NextRequest) {
  const event = req.headers.get("x-github-event") || "unknown";
  const signature = req.headers.get("x-hub-signature-256");

  const rawBody = await req.text();

  if (!verifySignature(rawBody, signature)) {
    return Response.json({ error: "签名验证失败" }, { status: 403 });
  }

  if (event === "ping") {
    return Response.json({ message: "pong" });
  }

  if (event !== "push") {
    return Response.json({ message: `忽略 ${event} 事件` });
  }

  // 解析本次推送的 commit（push payload 的 after 字段）
  let commit = "unknown";
  try {
    const payload = JSON.parse(rawBody);
    commit = payload.after || "unknown";
  } catch {}

  // 关键：在返回 200 之前 await 写库，确保 GitHub 收到 200 即代表此行已落库
  await writeDeployStatus("triggered", { commit });

  const projectDir = process.cwd();

  // 注意：写库必须在 pm2 restart 之前 await 完成，否则进程重启会打断写库
  exec(
    `cd "${projectDir}" && git pull origin master 2>&1 && npm install 2>&1 && npm run build 2>&1`,
    { timeout: 1200000, maxBuffer: 10 * 1024 * 1024 },
    async (error, stdout) => {
      const ok = !error;
      // 先写状态（await 完成），再重启
      await writeDeployStatus(ok ? "done" : "failed", {
        commit,
        error: error ? error.message.slice(0, 500) : null,
        tail: stdout ? stdout.slice(-800) : "",
      });
      // 写库完成后再重启（可能杀掉本进程，但写库已落库）
      if (ok) {
        exec("pm2 restart ai-writer", { timeout: 60000 }, () => {});
      }
    }
  );

  return Response.json({ success: true, message: "部署已触发", commit });
}
