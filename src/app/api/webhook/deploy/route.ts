import { NextRequest } from "next/server";
import { exec } from "child_process";
import { createHmac, timingSafeEqual } from "crypto";

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
    { timeout: 300000, maxBuffer: 10 * 1024 * 1024 },
    (error, stdout) => {
      if (error) {
        console.error("[webhook部署失败]", error.message);
        console.error(stdout);
      } else {
        console.log("[webhook部署成功]", stdout.slice(-500));
      }
    }
  );

  return Response.json({ success: true, message: "部署已触发" });
}
