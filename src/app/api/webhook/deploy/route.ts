import { NextRequest } from "next/server";
import { exec } from "child_process";

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "";

export async function POST(req: NextRequest) {
  const token = req.headers.get("x-webhook-secret") || req.nextUrl.searchParams.get("token");
  if (WEBHOOK_SECRET && token !== WEBHOOK_SECRET) {
    return Response.json({ error: "未授权" }, { status: 403 });
  }

  const event = req.headers.get("x-github-event");
  if (event && event !== "push") {
    return Response.json({ message: "忽略非 push 事件" });
  }

  const projectDir = process.cwd();

  // 异步执行部署，不阻塞响应
  exec(`
    cd "${projectDir}" && \
    git pull origin master 2>&1 && \
    npm install 2>&1 && \
    npm run build 2>&1 && \
    pm2 restart ai-writer 2>&1
  `, {
    timeout: 120000,
    maxBuffer: 10 * 1024 * 1024,
  }, (error, stdout) => {
    if (error) {
      console.error("[webhook部署失败]", error.message);
      console.error(stdout);
    } else {
      console.log("[webhook部署成功]", stdout.slice(-500));
    }
  });

  return Response.json({ success: true, message: "部署已触发" });
}
