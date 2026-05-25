import { NextRequest } from "next/server";
import { supabase, getCurrentUser } from "@/lib/supabase";

export async function GET(_req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "请先登录" }, { status: 401 });

    // 获取余额
    const { data: balance } = await supabase
      .from("user_balances")
      .select("remaining_words, total_purchased_words")
      .eq("user_id", user.id)
      .single();

    // 如果没有余额记录，初始化一条
    if (!balance) {
      await supabase.from("user_balances").insert({
        user_id: user.id,
        remaining_words: 0,
        total_purchased_words: 0,
      });
      return Response.json({ remaining_words: 0, total_purchased_words: 0 });
    }

    return Response.json({
      remaining_words: balance.remaining_words ?? 0,
      total_purchased_words: balance.total_purchased_words ?? 0,
    });
  } catch (error: any) {
    console.error("[获取余额]", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
