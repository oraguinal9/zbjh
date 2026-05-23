import { NextRequest } from "next/server";
import { supabase, getCurrentUser } from "@/lib/supabase";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "未登录" }, { status: 401 });
    const { id } = await params;
    const { data: project } = await supabase.from("projects").select("id").eq("id", id).eq("user_id", user.id).single();
    if (!project) return Response.json({ error: "作品不存在" }, { status: 404 });

    const { data, error } = await supabase.from("characters").select("*").eq("project_id", id).order("created_at");
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json(data);
  } catch (error: any) {
    console.error("[获取角色列表]", error.message);
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

    const { name, description, traits, relations } = await req.json();
    const { data, error } = await supabase
      .from("characters").insert({ project_id: id, name, description, traits, relations }).select().single();
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json(data);
  } catch (error: any) {
    console.error("[创建角色]", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "未登录" }, { status: 401 });
    const { id } = await params;
    const { data: project } = await supabase.from("projects").select("id").eq("id", id).eq("user_id", user.id).single();
    if (!project) return Response.json({ error: "作品不存在" }, { status: 404 });

    const { charId } = await req.json();
    const { error } = await supabase.from("characters").delete().eq("id", charId).eq("project_id", id);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ success: true });
  } catch (error: any) {
    console.error("[删除角色]", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
