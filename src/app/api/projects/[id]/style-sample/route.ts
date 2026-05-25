import { NextRequest } from "next/server";
import { supabase, getCurrentUser } from "@/lib/supabase";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "未登录" }, { status: 401 });
    const { id } = await params;
    const { data, error } = await supabase.from("projects").select("id, style_sample").eq("id", id).eq("user_id", user.id).single();
    if (error) return Response.json({ error: error.message }, { status: 404 });
    return Response.json({ style_sample: data.style_sample || "" });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "未登录" }, { status: 401 });
    const { id } = await params;
    const { style_sample } = await req.json();
    const { error } = await supabase.from("projects").update({ style_sample }).eq("id", id).eq("user_id", user.id);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ success: true });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
