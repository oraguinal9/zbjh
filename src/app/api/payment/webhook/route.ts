import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";

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

    // 更新订单状态
    await supabase
      .from("orders")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", order.id);

    // 增加用户余额
    const { data: balance } = await supabase
      .from("user_balances")
      .select("remaining_words, total_purchased_words")
      .eq("user_id", order.user_id)
      .single();

    if (balance) {
      await supabase
        .from("user_balances")
        .update({
          remaining_words: (balance.remaining_words || 0) + order.words,
          total_purchased_words: (balance.total_purchased_words || 0) + order.words,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", order.user_id);
    } else {
      await supabase.from("user_balances").insert({
        user_id: order.user_id,
        remaining_words: order.words,
        total_purchased_words: order.words,
      });
    }

    // 首次充值 → 奖励邀请人
    const isFirstPaidOrder = order.package_type === "first";
    if (isFirstPaidOrder) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("invited_by")
        .eq("id", order.user_id)
        .single();

      if (profile?.invited_by) {
        // 检查是否已经奖励过
        const { data: existingReward } = await supabase
          .from("invite_rewards")
          .select("id")
          .eq("user_id", profile.invited_by)
          .eq("related_user_id", order.user_id)
          .eq("reason", "recharge_bonus")
          .single();

        if (!existingReward) {
          const bonusWords = 200_000; // 20万字
          const { data: invBalance } = await supabase
            .from("user_balances")
            .select("remaining_words, total_purchased_words")
            .eq("user_id", profile.invited_by)
            .single();

          if (invBalance) {
            await supabase
              .from("user_balances")
              .update({
                remaining_words: (invBalance.remaining_words || 0) + bonusWords,
                total_purchased_words: (invBalance.total_purchased_words || 0) + bonusWords,
                updated_at: new Date().toISOString(),
              })
              .eq("user_id", profile.invited_by);
          } else {
            await supabase.from("user_balances").insert({
              user_id: profile.invited_by,
              remaining_words: bonusWords,
              total_purchased_words: bonusWords,
            });
          }

          await supabase.from("invite_rewards").insert({
            user_id: profile.invited_by,
            amount_words: bonusWords,
            reason: "recharge_bonus",
            related_user_id: order.user_id,
          });
        }
      }
    }

    return Response.json({ success: true, message: "充值成功" });
  } catch (error: any) {
    console.error("[支付回调]", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
