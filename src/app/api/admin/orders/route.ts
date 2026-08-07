import { NextRequest } from "next/server";

// 管理端：待审核订单 + 最近已处理订单（含用户邮箱）
export async function GET(req: NextRequest) {
  const adminKey = process.env.ADMIN_SECRET;
  if (!adminKey || req.headers.get("x-admin-key") !== adminKey) {
    return Response.json({ error: "无管理员权限" }, { status: 403 });
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return Response.json({ error: "DATABASE_URL 未配置" }, { status: 500 });

  try {
    const pgModule = await import("pg") as { Pool: new (opts: { connectionString: string }) => { query: (sql: string, params?: any[]) => Promise<any>; end: () => Promise<void> } };
    const pool = new pgModule.Pool({ connectionString: databaseUrl });

    const { rows: submitted } = await pool.query(`
      SELECT o.id, o.order_no, o.amount, o.words, o.package_type, o.payment_method,
             o.created_at, o.submitted_at, o.proof_note,
             (o.proof_image IS NOT NULL AND o.proof_image <> '') AS has_image,
             COALESCE(u.email, '未知用户') AS email
      FROM orders o
      LEFT JOIN auth.users u ON u.id = o.user_id
      WHERE o.status = 'submitted'
      ORDER BY o.submitted_at DESC
      LIMIT 100
    `);

    const { rows: recent } = await pool.query(`
      SELECT o.id, o.order_no, o.amount, o.words, o.package_type, o.status, o.payment_method,
             o.created_at, o.submitted_at, o.reviewed_at, o.review_note,
             COALESCE(u.email, '未知用户') AS email
      FROM orders o
      LEFT JOIN auth.users u ON u.id = o.user_id
      WHERE o.status IN ('paid', 'rejected')
      ORDER BY o.reviewed_at DESC NULLS LAST
      LIMIT 20
    `);

    await pool.end();
    return Response.json({ submitted, recent });
  } catch (e: any) {
    console.error("[管理端订单列表]", e.message);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
