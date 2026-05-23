import { NextRequest } from "next/server";
import { supabase, getCurrentUser } from "@/lib/supabase";

async function checkOwnership(projectId: string, chapterId: string) {
  const user = await getCurrentUser();
  if (!user) return { authorized: false, error: "未登录" };

  // Verify the chapter belongs to a volume that belongs to a project owned by this user
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
    const { id, cid } = await params;
    const { authorized, error } = await checkOwnership(id, cid);
    if (!authorized) return Response.json({ error }, { status: 401 });

    const { data } = await supabase.from("chapters").select("*").eq("id", cid).single();
    return Response.json(data);
  } catch (error: any) {
    console.error("[获取章节]", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string; cid: string }> }) {
  try {
    const { id, cid } = await params;
    const { authorized, error } = await checkOwnership(id, cid);
    if (!authorized) return Response.json({ error }, { status: 401 });

    const { content, title } = await req.json();
    const wordCount = content ? content.replace(/\s/g, "").length : 0;
    const update: Record<string, string | number> = { updated_at: new Date().toISOString() };
    if (content !== undefined) { update.content = content; update.word_count = wordCount; }
    if (title !== undefined) update.title = title;

    const { data } = await supabase.from("chapters").update(update).eq("id", cid).select().single();
    if (!data) return Response.json({ error: "章节不存在" }, { status: 404 });
    return Response.json(data);
  } catch (error: any) {
    console.error("[更新章节]", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
