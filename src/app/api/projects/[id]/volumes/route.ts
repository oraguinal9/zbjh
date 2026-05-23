import { NextRequest } from "next/server";
import { supabase, getCurrentUser } from "@/lib/supabase";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "未登录" }, { status: 401 });
    const { id } = await params;
    const { data: project } = await supabase.from("projects").select("id").eq("id", id).eq("user_id", user.id).single();
    if (!project) return Response.json({ error: "作品不存在" }, { status: 404 });

    const { data, error } = await supabase.from("volumes").select("*").eq("project_id", id).order("sort_order");
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json(data);
  } catch (error: any) {
    console.error("[获取卷列表]", error.message);
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

    const { title } = await req.json();
    if (!title) return Response.json({ error: "卷名不能为空" }, { status: 400 });

    const { data: last } = await supabase.from("volumes").select("sort_order").eq("project_id", id).order("sort_order", { ascending: false }).limit(1);
    const sort_order = (last?.[0]?.sort_order || 0) + 1;

    const { data, error } = await supabase.from("volumes").insert({ project_id: id, title, sort_order }).select().single();
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json(data);
  } catch (error: any) {
    console.error("[创建卷]", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
