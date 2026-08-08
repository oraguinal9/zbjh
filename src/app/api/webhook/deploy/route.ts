import { NextRequest } from "next/server";
import { exec } from "child_process";
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
const LOCK_MAX_AGE = 70 * 60 * 1000;
const DEPLOY_LOG = "/tmp/zbjh-deploy.log";

// 只改动这些文件时不重建（只 git pull）
const DOCS_ONLY = /^(docs\/|CLAUDE\.md|AGENTS\.md|README\.md|\.gitignore|.*\.md$)/;

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

function readLogTail(maxLen = 800): string {
  try {
    if (!existsSync(DEPLOY_LOG)) return "";
    const content = readFileSync(DEPLOY_LOG, "utf8");
    return content.slice(-maxLen);
  } catch {
    return "";
  }
}

// 判断两次提交之间是否只改了文档（需要先 fetch，让 after 提交存在本地）
function isDocsOnlyChange(projectDir: string, before: string, after: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (!before || !after || before === "0000000000000000000000000000000000000000") {
      resolve(false);
      return;
    }
    exec(
      `cd "${projectDir}" && git fetch origin master --quiet 2>&1 && git diff --name-only ${before} ${after} 2>&1`,
      { timeout: 120000, maxBuffer: 5 * 1024 * 1024 },
      (error, stdout) => {
        if (error) return resolve(false); // 无法判断 → 保守走完整构建
        const files = stdout.split("\n").map((f) => f.trim()).filter(Boolean);
        if (files.length === 0) return resolve(false);
        resolve(files.every((f) => DOCS_ONLY.test(f)));
      }
    );
  });
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

  let before = "";
  let commit = "unknown";
  try {
    const payload = JSON.parse(rawBody);
    before = payload.before || "";
    commit = payload.after || "unknown";
  } catch {}

  if (lockBusy()) {
    await writeDeployStatus("skipped", { commit, reason: "build already running" });
    return Response.json({ success: true, skipped: true, message: "构建进行中，已跳过本次" });
  }

  await writeDeployStatus("triggered", { commit });
  writeFileSync(LOCK_FILE, String(Date.now()));

  const projectDir = process.cwd();

  // 仅文档改动：只拉取，不重建
  const docsOnly = await isDocsOnlyChange(projectDir, before, commit);
  if (docsOnly) {
    exec(
      `cd "${projectDir}" && git pull origin master 2>&1`,
      { timeout: 300000, maxBuffer: 10 * 1024 * 1024 },
      async (error) => {
        await writeDeployStatus(error ? "failed" : "docs_only_done", {
          commit,
          error: error ? error.message.slice(0, 500) : null,
        });
        try {
          if (existsSync(LOCK_FILE)) unlinkSync(LOCK_FILE);
        } catch {}
      }
    );
    return Response.json({ success: true, message: "仅文档改动，已拉取不重建", commit, docsOnly: true });
  }

  // 代码改动：拉取 + 清理构建目录 + 构建（输出落盘）+ 校验 BUILD_ID + 重启
  exec(
    `cd "${projectDir}" && git pull origin master 2>&1 && rm -rf .next && (npm run build > "${DEPLOY_LOG}" 2>&1) && test -f .next/BUILD_ID && pm2 restart ai-writer 2>&1`,
    { timeout: 4500000, maxBuffer: 20 * 1024 * 1024 },
    async (error) => {
      await writeDeployStatus(error ? "failed" : "done", {
        commit,
        error: error ? error.message.slice(0, 500) : null,
        logTail: error ? readLogTail() : "",
      });
      try {
        if (existsSync(LOCK_FILE)) unlinkSync(LOCK_FILE);
      } catch {}
    }
  );

  return Response.json({ success: true, message: "部署已触发", commit });
}
