import { execSync } from "child_process";

export async function GET() {
  let commit = "unknown";
  let branch = "unknown";
  try {
    commit = execSync("git rev-parse HEAD").toString().trim();
  } catch {
    commit = process.env.VERCEL_GIT_COMMIT_SHA || "unknown";
  }
  try {
    branch = execSync("git rev-parse --abbrev-ref HEAD").toString().trim();
  } catch {}
  return Response.json({
    commit,
    branch,
    deployedAt: new Date().toISOString(),
    note: "执笔惊鸿部署版本探针",
  });
}
