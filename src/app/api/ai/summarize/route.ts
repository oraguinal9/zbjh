import { NextRequest } from "next/server";
import { supabase, getCurrentUser } from "@/lib/supabase";
import { aiChat } from "@/lib/ai";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "未登录" }, { status: 401 });

    const { chapterId, content, projectId } = await req.json();
    if (!chapterId || !content?.trim()) {
      return Response.json({ error: "章节ID和内容不能为空" }, { status: 400 });
    }

    // 用AI生成摘要（2-3句话）
    const summary = await aiChat(
      "你是小说摘要助手。用2-3句话概括这一章的核心剧情，包括：发生了什么事、主角有什么变化或决定、章末是什么状态。语言简洁，不要修饰词。",
      `章节内容：\n${content.slice(0, 4000)}`
    );

    const cleanSummary = summary.replace(/^(摘要|总结|概括)[：:]\s*/i, "").trim();

    // 保存到数据库
    await supabase
      .from("chapters")
      .update({ summary: cleanSummary })
      .eq("id", chapterId);

    return Response.json({ summary: cleanSummary });
  } catch (error: any) {
    console.error("[生成摘要]", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
