import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  // Require authentication + admin key
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ success: false, error: "请先登录" }, { status: 401 });
  }
  const adminKey = process.env.ADMIN_SECRET;
  if (!adminKey) {
    return Response.json({ success: false, error: "服务端未配置 ADMIN_SECRET，无法执行迁移" }, { status: 500 });
  }
  if (req.headers.get("x-admin-key") !== adminKey) {
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

    // 旧迁移
    await pool.query(`ALTER TABLE chapters ADD COLUMN IF NOT EXISTS outline TEXT DEFAULT ''`);

    // 文风样本列
    await pool.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS style_sample TEXT DEFAULT ''`);

    // 章节摘要列
    await pool.query(`ALTER TABLE chapters ADD COLUMN IF NOT EXISTS summary TEXT DEFAULT ''`);

    // 大纲文本列
    await pool.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS outline TEXT DEFAULT ''`);

    // 邀请系统表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS profiles (
        id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
        invite_code VARCHAR(8) UNIQUE NOT NULL,
        invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // 给 invite_code 加索引
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_profiles_invite_code ON profiles(invite_code)`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS invite_rewards (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        amount_words INTEGER NOT NULL DEFAULT 0,
        reason VARCHAR(50) NOT NULL,
        related_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // 支付系统表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_balances (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
        remaining_words INTEGER NOT NULL DEFAULT 0,
        total_purchased_words INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        order_no VARCHAR(64) NOT NULL UNIQUE,
        amount DECIMAL(10,2) NOT NULL,
        words INTEGER NOT NULL DEFAULT 0,
        package_type VARCHAR(20) NOT NULL DEFAULT 'first',
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        payment_method VARCHAR(20) DEFAULT 'alipay',
        paid_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS usage_records (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        words_used INTEGER NOT NULL DEFAULT 0,
        feature VARCHAR(50) NOT NULL,
        project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
        chapter_id UUID REFERENCES chapters(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await pool.end();
    return Response.json({ success: true, message: "支付系统表 + 邀请系统表创建成功" });
  } catch (e: any) {
    return Response.json({ success: false, error: e.message });
  }
}
