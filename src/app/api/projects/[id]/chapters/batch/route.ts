import { NextRequest } from "next/server";
import { supabase, getCurrentUser } from "@/lib/supabase";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "未登录" }, { status: 401 });
    const { id } = await params;

    const { data: project } = await supabase.from("projects").select("id").eq("id", id).eq("user_id", user.id).single();
    if (!project) return Response.json({ error: "作品不存在" }, { status: 404 });

    const { ids } = await req.json();
    if (!Array.isArray(ids) || !ids.length) {
      return Response.json({ error: "请选择要删除的章节" }, { status: 400 });
    }

    const { data: volumes } = await supabase.from("volumes").select("id").eq("project_id", id);
    const volIds = (volumes || []).map((v) => v.id);
    if (!volIds.length) return Response.json({ error: "没有卷" }, { status: 404 });

    const { data: chapters } = await supabase.from("chapters").select("id").in("volume_id", volIds);
    const validIds = new Set((chapters || []).map((c) => c.id));
    const toDelete = ids.filter((i: string) => validIds.has(i));

    if (!toDelete.length) return Response.json({ error: "无效的章节ID" }, { status: 400 });

    const { error } = await supabase.from("chapters").delete().in("id", toDelete);
    if (error) return Response.json({ error: error.message }, { status: 500 });

    return Response.json({ success: true, count: toDelete.length });
  } catch (error: any) {
    console.error("[批量删除章节]", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
