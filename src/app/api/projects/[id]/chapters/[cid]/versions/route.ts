import { NextRequest } from "next/server";
import { supabase, getCurrentUser } from "@/lib/supabase";

async function checkOwnership(projectId: string, chapterId: string) {
  const user = await getCurrentUser();
  if (!user) return { authorized: false, error: "未登录" };

  const { data: chapter } = await supabase.from("chapters").select("volume_id").eq("id", chapterId).single();
  if (!chapter) return { authorized: false, error: "章节不存在" };

  const { data: volume } = await supabase.from("volumes").select("project_id").eq("id", chapter.volume_id).single();
  if (!volume) return { authorized: false, error: "卷不存在" };

  const { data: project } = await supabase.from("projects").select("id").eq("id", volume.project_id).eq("user_id", user.id).single();
  if (!project) return { authorized: false, error: "无权访问" };

  return { authorized: true, error: null };
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string; cid: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "未登录" }, { status: 401 });

    const { id, cid } = await params;
    const { authorized, error } = await checkOwnership(id, cid);
    if (!authorized) return Response.json({ error }, { status: 401 });

    const { data } = await supabase.from("ai_history").select("*").eq("chapter_id", cid).order("created_at", { ascending: false }).limit(20);
    return Response.json(data || []);
  } catch (error: any) {
    console.error("[获取历史版本]", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; cid: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "未登录" }, { status: 401 });

    const { id, cid } = await params;
    const { authorized, error } = await checkOwnership(id, cid);
    if (!authorized) return Response.json({ error }, { status: 401 });

    const { generated_content, prompt, model_used } = await req.json();
    await supabase.from("ai_history").insert({ project_id: id, chapter_id: cid, generated_content, prompt, model_used });
    return Response.json({ success: true });
  } catch (error: any) {
    console.error("[保存历史版本]", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
