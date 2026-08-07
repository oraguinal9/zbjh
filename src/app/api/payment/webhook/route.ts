import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { creditOrder } from "@/lib/payment";

/**
 * 支付回调（支持mock模式方便测试）
 * 正式对接支付宝后，验证支付宝签名
 */
export async function POST(req: NextRequest) {
  try {
    const { order_no, mock_admin_key } = await req.json();

    if (!order_no) return Response.json({ error: "缺少订单号" }, { status: 400 });

    // mock模式：需要传入有效key，防止任意调用
    const adminKey = process.env.ADMIN_SECRET;
    if (!adminKey || mock_admin_key !== adminKey) {
      return Response.json({ error: "无效的密钥" }, { status: 403 });
    }

    // 查订单
    const { data: order } = await supabase
      .from("orders")
      .select("*")
      .eq("order_no", order_no)
      .single();

    if (!order) return Response.json({ error: "订单不存在" }, { status: 404 });
    if (order.status === "paid") return Response.json({ error: "订单已支付" }, { status: 400 });

    // 确认到账（订单置paid + 加余额 + 邀请奖励）
    await creditOrder(order);

    return Response.json({ success: true, message: "充值成功" });
  } catch (error: any) {
    console.error("[支付回调]", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
