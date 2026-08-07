import { NextRequest } from "next/server";
import { aiChatStream } from "@/lib/ai";
import { checkQuotaOrError, withBillingStream } from "@/lib/billing";

export async function POST(req: NextRequest) {
  try {
    const { paidUserId, errorResponse } = await checkQuotaOrError(req);
    if (errorResponse) return errorResponse;

    const { text, projectId, chapterTitle, genre } = await req.json();
    if (!text || text.replace(/\s/g, "").length < 100) {
      return Response.json({ error: "请先撰写章节内容（至少100字）再体检" }, { status: 400 });
    }

    let charactersText = "";
    if (projectId) {
      const { supabase } = await import("@/lib/supabase");
      const { data: chars } = await supabase
        .from("characters")
        .select("name, description, traits")
        .eq("project_id", projectId)
        .limit(30);
      if (chars?.length) {
        charactersText = chars
          .map((c: any) => `- ${c.name}：${c.description || ""}`)
          .join("\n");
      }
    }

    const system = `你是番茄小说平台的资深编辑兼质检专家。对章节做五层多维体检，输出给作者看的诊断报告。

【固定输出格式】
【整体结论】一句话（先给最致命的问题或最亮眼的优点）

① 逻辑连贯 x/10
问题清单：定位到具体句子（引用原文片段），给改法。查：时间线/因果/资源/身份/伤势/战力/情绪七条链，以及伏笔有没有兑现或新埋。

② 读者留存 x/10
查：开头3行进没进事件、章尾钩子强不强、爽点密度（番茄标准3章一爽、本章有没有核心爽点）、代入感、节奏。

③ 编辑合规 x/10
查：字数（番茄男频建议2000-2500）、标题、黄金三章（若是前3章）、平台红线、卖点是否清晰。

④ 文笔技术 x/10
查：AI味（破折号滥用、仿佛/然而/这一刻等高频词）、重复词、对话是否一人一声、排比空泛抒情。

⑤ 市场预判 x/10
模拟追读：这章看完会不会点下一章？给出弃书风险点。

⑥ 爽点与钩子 x/10
查：核心爽点在哪、打脸四拍（蓄-忍-打-震）是否完整、钩子类型与位置、下一章钩子是否够强。

⑦ 人物声线 x/10
查：对话是否符合角色设定与身份（如有角色清单则逐一对齐）。${charactersText ? `\n【本书角色清单】\n${charactersText}` : ""}

【修改优先级】
P0（影响留存，必须改）：
P1（逻辑硬伤）：
P2（文笔润色）：

【最该改的一句】引用原文 + 一句话改法。

规则：定位到句，不空泛；每层问题给可执行改法；语气像资深编辑，直接、犀利、有用；总字数控制在1200字以内。`;

    let stream = await aiChatStream(
      system,
      `请体检以下章节${chapterTitle ? `（《${chapterTitle}》）` : ""}${genre ? `，题材：${genre}` : ""}：\n\n${text.slice(0, 8000)}`,
      { temperature: 0.4, max_tokens: 4096 },
    );

    if (paidUserId) {
      stream = withBillingStream(stream, paidUserId, "inspect");
    }

    return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
  } catch (error: any) {
    console.error("[AI体检]", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
