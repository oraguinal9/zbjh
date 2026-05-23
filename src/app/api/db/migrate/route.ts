import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  // Require authentication + admin key
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ success: false, error: "请先登录" }, { status: 401 });
  }
  const adminKey = process.env.ADMIN_SECRET;
  if (adminKey && req.headers.get("x-admin-key") !== adminKey) {
    return Response.json({ success: false, error: "无管理员权限" }, { status: 403 });
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return Response.json({
      success: false,
      error: "DATABASE_URL 未配置。请在 .env.local 中添加 DATABASE_URL=postgresql://postgres:密码@db.项目引用.supabase.co:5432/postgres",
      hint: "可在 Supabase 项目设置 → Database → Connection string → URI 中找到",
    });
  }

  try {
    const pgModule = await import("pg") as { Pool: new (opts: { connectionString: string }) => { query: (sql: string) => Promise<any>; end: () => Promise<void> } };
    const pool = new pgModule.Pool({ connectionString: databaseUrl });
    await pool.query(`ALTER TABLE chapters ADD COLUMN IF NOT EXISTS outline TEXT DEFAULT ''`);
    await pool.end();
    return Response.json({ success: true, message: "outline 列添加成功" });
  } catch (e: any) {
    return Response.json({ success: false, error: e.message });
  }
}
