import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { creditOrder } from "@/lib/payment";

// 管理端：人工审核 → 确认到账 / 驳回
export async function POST(req: NextRequest) {
  const adminKey = process.env.ADMIN_SECRET;
  if (!adminKey || req.headers.get("x-admin-key") !== adminKey) {
    return Response.json({ error: "无管理员权限" }, { status: 403 });
  }

  try {
    const { order_no, action, reason } = await req.json();
    if (!order_no || !["approve", "reject"].includes(action)) {
      return Response.json({ error: "参数错误" }, { status: 400 });
    }

    const { data: order } = await supabase
      .from("orders")
      .select("*")
      .eq("order_no", order_no)
      .single();

    if (!order) return Response.json({ error: "订单不存在" }, { status: 404 });
    if (order.status === "paid") return Response.json({ error: "该订单已到账" }, { status: 400 });
    if (order.status !== "submitted") {
      return Response.json({ error: "该订单不在待审核状态" }, { status: 400 });
    }

    if (action === "approve") {
      await creditOrder(order);
      return Response.json({ success: true, message: "已确认到账，余额已发放" });
    }

    // reject
    await supabase
      .from("orders")
      .update({
        status: "rejected",
        reviewed_at: new Date().toISOString(),
        review_note: (reason || "凭证不符").trim().slice(0, 200),
      })
      .eq("id", order.id);

    return Response.json({ success: true, message: "已驳回" });
  } catch (e: any) {
    console.error("[人工审核]", e.message);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
