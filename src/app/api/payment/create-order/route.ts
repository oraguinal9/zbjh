import { NextRequest } from "next/server";
import { supabase, getCurrentUser } from "@/lib/supabase";
import { PACKAGES, type PackageType } from "@/lib/billing";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "请先登录" }, { status: 401 });

    const { type } = await req.json() as { type: PackageType };
    const pkg = PACKAGES[type];
    if (!pkg) return Response.json({ error: "无效的套餐类型" }, { status: 400 });

    // 判断是否是首充：如果该用户已有 paid 订单，则为续费
    const { data: existingOrders } = await supabase
      .from("orders")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "paid")
      .limit(1);

    const actualType: PackageType = existingOrders && existingOrders.length > 0 ? "renew" : "first";
    const actualPkg = PACKAGES[actualType];

    // 生成订单号: 时间戳 + 随机4位
    const orderNo = `AI${Date.now()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    const { data: order, error } = await supabase.from("orders").insert({
      user_id: user.id,
      order_no: orderNo,
      amount: actualPkg.amount,
      words: actualPkg.words,
      package_type: actualType,
      status: "pending",
    }).select().single();

    if (error) throw error;

    // 返回订单信息 + 支付二维码（mock，后续对接支付宝）
    return Response.json({
      success: true,
      order: {
        id: order.id,
        order_no: order.order_no,
        amount: actualPkg.amount,
        words: actualPkg.words,
        package_type: actualType,
        status: order.status,
      },
    });
  } catch (error: any) {
    console.error("[创建订单]", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
