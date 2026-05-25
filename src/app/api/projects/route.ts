import { NextRequest } from "next/server";
import { supabase, getCurrentUser } from "@/lib/supabase";

export async function GET(_req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "未登录" }, { status: 401 });
    const { data, error } = await supabase.from("projects").select("*").eq("user_id", user.id).order("updated_at", { ascending: false });
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json(data);
  } catch (error: any) {
    console.error("[项目列表]", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "未登录" }, { status: 401 });
    const { title, genre, summary, outline } = await req.json();

    const { data: project, error: projErr } = await supabase
      .from("projects").insert({ title, genre, summary, outline, status: "writing", user_id: user.id }).select().single();
    if (projErr) return Response.json({ error: projErr.message }, { status: 500 });

    if (outline) {
      const volMatches = [...outline.matchAll(/第(\d+|[一二三四五])卷[：:]\s*([^\n]*)/g)];
      const volStarts = volMatches.map((m) => m.index!);
      const volNames = volMatches.map((m) => `第${m[1]}卷` + (m[2] ? `：${m[2].trim()}` : ""));

      for (let i = 0; i < volMatches.length; i++) {
        const startIdx = volStarts[i];
        const endIdx = i + 1 < volStarts.length ? volStarts[i + 1] : outline.length;
        const volText = outline.slice(startIdx, endIdx);

        // 从大纲文本提取章节范围，嵌入卷标题
        const rangeMatch = volText.match(/章节范围[：:]\s*(\d+-\d+)/);
        const volTitle = rangeMatch ? `${volNames[i]}（${rangeMatch[1]}章）` : volNames[i];

        const { data: volume } = await supabase
          .from("volumes").insert({ project_id: project.id, title: volTitle, sort_order: i + 1 }).select().single();
        if (!volume) continue;

        const chMatches = [...volText.matchAll(/第(\d+)章[：:\s]+([^\n]+)/g)];
        for (let j = 0; j < chMatches.length; j++) {
          await supabase.from("chapters").insert({
            volume_id: volume.id,
            title: `第${chMatches[j][1]}章：${chMatches[j][2].trim().slice(0, 80)}`,
            sort_order: parseInt(chMatches[j][1]),
          });
        }
      }
    }

    return Response.json(project);
  } catch (error: any) {
    console.error("[创建项目]", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "未登录" }, { status: 401 });
    const { id } = await req.json();
    const { error } = await supabase.from("projects").delete().eq("id", id).eq("user_id", user.id);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ success: true });
  } catch (error: any) {
    console.error("[删除项目]", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
