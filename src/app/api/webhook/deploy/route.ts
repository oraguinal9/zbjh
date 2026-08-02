import { NextRequest } from "next/server";
import { exec } from "child_process";
import { createHmac, timingSafeEqual } from "crypto";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://khgnjblnukxteyufvjym.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "sb_publishable_BQ91PYvokaGrK6UU6shFjQ_oO-BVsm9";

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "";

function verifySignature(payload: string, signature: string | null): boolean {
  if (!WEBHOOK_SECRET || !signature) return false;
  const sig = signature.startsWith("sha256=") ? signature.slice(7) : signature;
  const expected = createHmac("sha256", WEBHOOK_SECRET).update(payload).digest("hex");
  if (sig.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
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

  const projectDir = process.cwd();

  exec(
    `cd "${projectDir}" && git pull origin master 2>&1 && npm install 2>&1 && npm run build 2>&1 && pm2 restart ai-writer 2>&1`,
    { timeout: 900000, maxBuffer: 10 * 1024 * 1024 },
    async (error, stdout) => {
      const ok = !error;
      const note = JSON.stringify({
        deploy_ok: ok,
        error: error ? error.message.slice(0, 500) : null,
        tail: stdout ? stdout.slice(-800) : "",
        at: new Date().toISOString(),
      });
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
        const { error: we } = await supabase.from("transactions").insert({ project: "system", type: "deploy_ping", amount: 0, note });
        console.log("[deploy status written]", we ? we.message : "ok");
      } catch (e) {
        console.error("[deploy status write failed]", (e as Error).message);
      }
      if (!ok) {
        console.error("[webhook部署失败]", error?.message);
        console.error(stdout);
      } else {
        console.log("[webhook部署成功]", stdout.slice(-300));
      }
    }
  );

  return Response.json({ success: true, message: "部署已触发" });
}
