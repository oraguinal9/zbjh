import { NextRequest } from "next/server";
import { aiChat } from "@/lib/ai";
import { incrementCount } from "@/lib/rate-limit";
import { checkQuotaOrError, countTextWords, deductWords } from "@/lib/billing";
import { buildWritingSystemPrompt } from "@/lib/templates";

export async function POST(req: NextRequest) {
  try {
    const { paidUserId, errorResponse } = await checkQuotaOrError(req);
    if (errorResponse) return errorResponse;

    const { text, targetWords, projectId, genre } = await req.json();
    if (!text) return Response.json({ error: "内容不能为空" }, { status: 400 });

    const currentWords = text.replace(/\s/g, "").length;
    if (targetWords && targetWords <= currentWords) {
      return Response.json({ error: "目标字数必须大于当前字数" }, { status: 400 });
    }

    // 获取文风样本
    let stylePrompt = "";
    if (projectId) {
      const { supabase } = await import("@/lib/supabase");
      const { data: proj } = await supabase.from("projects").select("style_sample").eq("id", projectId).single();
      if (proj?.style_sample) {
        stylePrompt = `\n\n【文风参考——请严格模仿以下文字的句式和节奏】\n${proj.style_sample.slice(0, 2000)}`;
      }
    }

    const genreTemplate = genre ? buildWritingSystemPrompt(genre) : "";
    const system = `你是网文扩写专家。在保持原意、风格和情节走向不变的前提下，丰富细节、对话、心理描写和环境描写，达到目标字数。
${stylePrompt}
${genreTemplate}
【扩写优先级】
1. 优先扩写对话轮次：给角色之间增加更有张力的对话
2. 其次丰富环境描写：场景氛围、天气、光线、声音
3. 再丰富动作细节和心理活动
4. 最后才是旁白描述

要求：
- 保持原文的人称、语气、风格完全一致
- 增加细节描写：环境、动作、神态、心理
- 对话自然，可适当增加对话轮次和冲突
- 不要改变情节走向和关键事件
- 不要添加新角色或支线情节
- 不要水字数：每个增加的细节都要对剧情或氛围有价值
- 输出完整的扩写后内容，不要省略`;

    const result = await aiChat(system, `原文：\n${text}\n\n当前字数约${currentWords}字，请扩展到约${targetWords}字。保持风格一致。`, { max_tokens: 4096, temperature: 0.7 });

    // 付费用户按生成字数扣费
    if (paidUserId) {
      const wordsUsed = countTextWords(result);
      await deductWords(paidUserId, wordsUsed, "expand");
    } else {
      incrementCount(req);
    }

    return Response.json({ result });
  } catch (error: any) {
    console.error("[AI补字数]", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
