import { NextRequest } from "next/server";
import { supabase, getCurrentUser } from "@/lib/supabase";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "未登录" }, { status: 401 });
    const { id } = await params;
    const { data: project } = await supabase.from("projects").select("id").eq("id", id).eq("user_id", user.id).single();
    if (!project) return Response.json({ error: "作品不存在" }, { status: 404 });

    const { data: volumes } = await supabase.from("volumes").select("id").eq("project_id", id);
    if (!volumes?.length) return Response.json([]);

    const volumeIds = volumes.map((v) => v.id);
    const { data, error } = await supabase.from("chapters").select("*").in("volume_id", volumeIds).order("sort_order");
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json(data);
  } catch (error: any) {
    console.error("[获取章节列表]", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "未登录" }, { status: 401 });
    const { id } = await params;
    const { data: project } = await supabase.from("projects").select("id").eq("id", id).eq("user_id", user.id).single();
    if (!project) return Response.json({ error: "作品不存在" }, { status: 404 });

    const { volume_id, title } = await req.json();
    if (!volume_id || !title) return Response.json({ error: "卷ID和章名不能为空" }, { status: 400 });

    const { data: volume } = await supabase.from("volumes").select("id").eq("id", volume_id).eq("project_id", id).single();
    if (!volume) return Response.json({ error: "卷不存在" }, { status: 404 });

    const { data: last } = await supabase.from("chapters").select("sort_order").eq("volume_id", volume_id).order("sort_order", { ascending: false }).limit(1);
    const sort_order = (last?.[0]?.sort_order || 0) + 1;

    const { data, error } = await supabase.from("chapters").insert({ volume_id, title, sort_order, content: "" }).select().single();
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json(data);
  } catch (error: any) {
    console.error("[创建章节]", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
