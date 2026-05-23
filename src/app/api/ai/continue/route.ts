import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { checkFreeLimit, incrementCount } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const limit = await checkFreeLimit(req);
  if (!limit.allowed) {
    return Response.json({ error: limit.error, needLogin: true }, { status: 429 });
  }

  try {
    const { projectId, chapterId, title, genre, content, outline, targetWords = 2500 } = await req.json();
    if (!outline) return Response.json({ error: "章纲不能为空" }, { status: 400 });

    // ===== 1. 获取前文上下文（按项目过滤） =====
    let contextChunks = "";
    if (projectId && chapterId) {
      // Get project's volumes first, then chapters within those volumes
      const { data: volumes } = await supabase
        .from("volumes")
        .select("id")
        .eq("project_id", projectId);
      const volIds = (volumes || []).map((v: any) => v.id);
      if (volIds.length > 0) {
        const { data: allChapters } = await supabase
          .from("chapters")
          .select("id, title, content, sort_order, volume_id")
          .in("volume_id", volIds)
          .order("sort_order");

        if (allChapters && allChapters.length > 0) {
          const curIdx = allChapters.findIndex((c: any) => c.id === chapterId);
          const prev = allChapters.slice(Math.max(0, curIdx - 2), curIdx);

          if (prev.length > 0) {
            contextChunks = prev.map((ch: any) =>
              `【前章：《${ch.title}》结尾】${(ch.content || "").slice(-300)}`
            ).join("\n\n");
          }

          if (curIdx >= 0 && allChapters[curIdx]) {
            const currentVol = allChapters[curIdx].volume_id;
            const volChapters = allChapters.filter((c: any) => c.volume_id === currentVol);
            const volOutlines = volChapters.map((c: any) => `第${c.sort_order}章纲要：${c.title}`).join("\n");
            if (volOutlines) contextChunks += `\n\n【本卷各章纲要】\n${volOutlines}`;
          }
        }
      }
    }

    // ===== 2. 获取角色信息 =====
    let characterInfo = "";
    if (projectId) {
      const { data: chars } = await supabase
        .from("characters")
        .select("name, description, traits")
        .eq("project_id", projectId);

      if (chars && chars.length > 0) {
        characterInfo = chars.map((c: any) =>
          `${c.name}：${c.description || ""}。性格特征：${c.traits ? JSON.stringify(c.traits) : "暂无"}`
        ).join("\n");
      }
    }

    // ===== 3. 构建系统提示词 =====
    const system = `你是专业网文作者。节奏紧凑、爽点密集、反转自然、画面感强、代入感足。
对话多(60%+)、短句、章尾留钩子。不要排比句式。情感用行动表达。
${characterInfo ? `\n【角色设定】\n${characterInfo}\n请严格保持角色性格和说话风格一致。` : ""}`;

    // ===== 4. 构建完整用户提示词 =====
    const user = `作品：《${title || "未命名"}》（${genre || "都市"}）

${contextChunks ? `【前文回顾】\n${contextChunks}\n` : ""}
【当前任务】续写本章内容。
章纲：${outline}
目标字数：${targetWords}字左右。

要求：
- 承接前文风格和剧情，保持人物言行一致
- 如果前文有未收的伏笔，自然地呼应
- 章尾必须有钩子或悬念
${content ? `\n【当前已写内容（请从末尾续写）】\n${content.slice(-500)}` : ""}`;

    // ===== 5. 调用AI =====
    const API_KEY = process.env.AI_API_KEY!;
    const API_BASE = process.env.AI_API_BASE || "https://api.deepseek.com";
    const AI_MODEL = process.env.AI_MODEL || "deepseek-chat";

    const abortCtrl = new AbortController();
    const timeoutId = setTimeout(() => abortCtrl.abort(), 60000);
    const res = await fetch(`${API_BASE}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        max_tokens: 4096,
        temperature: 0.8,
        stream: true,
      }),
      signal: abortCtrl.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`AI请求失败: ${res.status}`);
    incrementCount(req);

    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    let buffer = "";
    const stream = new ReadableStream({
      async start(controller) {
        const reader = res.body!.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) { controller.close(); break; }
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";
            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6).trim();
                if (data === "[DONE]") { controller.close(); return; }
                try {
                  const json = JSON.parse(data);
                  const text = json.choices?.[0]?.delta?.content;
                  if (text) controller.enqueue(encoder.encode(text));
                } catch {}
              }
            }
          }
        } catch (e) { controller.error(e); }
      },
    });

    return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
  } catch (error: any) {
    console.error("[AI续写]", error.message);
    return Response.json({ error: error.message || "续写失败" }, { status: 500 });
  }
}
