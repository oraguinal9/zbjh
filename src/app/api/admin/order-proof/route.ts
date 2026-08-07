import { NextRequest } from "next/server";

// 管理端：按需加载某订单的付款截图
export async function GET(req: NextRequest) {
  const adminKey = process.env.ADMIN_SECRET;
  if (!adminKey || req.headers.get("x-admin-key") !== adminKey) {
    return Response.json({ error: "无管理员权限" }, { status: 403 });
  }

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return Response.json({ error: "缺少订单 id" }, { status: 400 });

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return Response.json({ error: "DATABASE_URL 未配置" }, { status: 500 });

  try {
    const pgModule = await import("pg") as { Pool: new (opts: { connectionString: string }) => { query: (sql: string, params?: any[]) => Promise<any>; end: () => Promise<void> } };
    const pool = new pgModule.Pool({ connectionString: databaseUrl });
    const { rows } = await pool.query(
      `SELECT proof_image FROM orders WHERE id = $1`,
      [id]
    );
    await pool.end();

    return Response.json({ proof_image: rows[0]?.proof_image || "" });
  } catch (e: any) {
    console.error("[读取截图]", e.message);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
