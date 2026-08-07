import { NextRequest } from "next/server";
import { supabase, getCurrentUser } from "@/lib/supabase";

// 当前用户的充值订单列表（含状态，供充值页展示）
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "请先登录" }, { status: 401 });

    const { data } = await supabase
      .from("orders")
      .select("id, order_no, amount, words, package_type, status, payment_method, created_at, submitted_at, reviewed_at, review_note")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    return Response.json({ orders: data || [] });
  } catch (e: any) {
    console.error("[查询订单]", e.message);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
