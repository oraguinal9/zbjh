import { NextRequest } from "next/server";
import { supabase, getCurrentUser } from "@/lib/supabase";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "未登录" }, { status: 401 });
    const { id } = await params;
    const { data, error } = await supabase.from("projects").select("*").eq("id", id).eq("user_id", user.id).single();
    if (error) return Response.json({ error: error.message }, { status: 404 });
    return Response.json(data);
  } catch (error: any) {
    console.error("[获取项目]", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
