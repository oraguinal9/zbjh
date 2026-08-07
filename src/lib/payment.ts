import { supabase } from "@/lib/supabase";

/**
 * 确认订单已支付并到账：
 * 1. 订单状态置为 paid
 * 2. 给用户加字数余额
 * 3. 首次充值给邀请人发奖励
 * 供支付回调（第三方通道）和人工审核（扫码转账）共用。
 */
export async function creditOrder(order: {
  id: string;
  order_no: string;
  user_id: string;
  words: number;
  package_type: string;
}) {
  const now = new Date().toISOString();

  // 订单置为已支付
  await supabase
    .from("orders")
    .update({ status: "paid", paid_at: now, reviewed_at: now, review_note: "" })
    .eq("id", order.id);

  // 加余额
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
        updated_at: now,
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
  if (order.package_type === "first") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("invited_by")
      .eq("id", order.user_id)
      .single();

    if (profile?.invited_by) {
      const { data: existingReward } = await supabase
        .from("invite_rewards")
        .select("id")
        .eq("user_id", profile.invited_by)
        .eq("related_user_id", order.user_id)
        .eq("reason", "recharge_bonus")
        .single();

      if (!existingReward) {
        const bonusWords = 200_000;
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
              updated_at: now,
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
}
