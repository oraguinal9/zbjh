import { NextRequest } from "next/server";
import { supabase, getCurrentUser } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "请先登录" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit")) || 50, 200);
    const offset = Number(searchParams.get("offset")) || 0;

    const { data: records, error } = await supabase
      .from("usage_records")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) return Response.json({ error: error.message }, { status: 500 });

    const { count } = await supabase
      .from("usage_records")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    return Response.json({ records: records || [], total: count || 0 });
  } catch (error: any) {
    console.error("[消费记录]", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
