import { NextRequest } from "next/server";
import { supabase, getCurrentUser } from "@/lib/supabase";

// 用户提交转账凭证（备注 + 付款截图），订单进入待审核状态
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "请先登录" }, { status: 401 });

    const { order_no, note, image, payment_method } = await req.json();
    if (!order_no) return Response.json({ error: "缺少订单号" }, { status: 400 });

    const { data: order } = await supabase
      .from("orders")
      .select("*")
      .eq("order_no", order_no)
      .eq("user_id", user.id)
      .single();

    if (!order) return Response.json({ error: "订单不存在" }, { status: 404 });
    if (order.status === "paid") return Response.json({ error: "该订单已到账，无需重复提交" }, { status: 400 });
    if (order.status === "submitted") return Response.json({ error: "该订单已提交审核，请耐心等待" }, { status: 400 });

    // 截图校验：必须是图片 dataURL，压缩后不超过 1.5MB
    if (image) {
      if (!image.startsWith("data:image/")) {
        return Response.json({ error: "截图格式不正确" }, { status: 400 });
      }
      if (image.length > 2_500_000) {
        return Response.json({ error: "截图太大，请重新选择清晰的图片（会自动压缩）" }, { status: 400 });
      }
    }

    await supabase
      .from("orders")
      .update({
        proof_note: (note || "").trim().slice(0, 200),
        proof_image: image || "",
        payment_method: payment_method === "wechat" ? "wechat" : "alipay",
        status: "submitted",
        submitted_at: new Date().toISOString(),
        reviewed_at: null,
        review_note: "",
      })
      .eq("id", order.id);

    return Response.json({ success: true, message: "凭证已提交，等待审核到账（一般 1~24 小时内）" });
  } catch (e: any) {
    console.error("[提交凭证]", e.message);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
