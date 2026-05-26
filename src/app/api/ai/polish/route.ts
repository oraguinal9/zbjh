import { NextRequest } from "next/server";
import { aiChat } from "@/lib/ai";
import { incrementCount } from "@/lib/rate-limit";
import { checkQuotaOrError, countTextWords, deductWords } from "@/lib/billing";
import { buildWritingSystemPrompt } from "@/lib/templates";

export async function POST(req: NextRequest) {
  try {
    const { paidUserId, errorResponse } = await checkQuotaOrError(req);
    if (errorResponse) return errorResponse;

    const { text, projectId, genre } = await req.json();
    if (!text) return Response.json({ error: "内容不能为空" }, { status: 400 });

    // 获取文风样本
    let styleSample = "";
    if (projectId) {
      const { supabase } = await import("@/lib/supabase");
      const { data: proj } = await supabase.from("projects").select("style_sample").eq("id", projectId).single();
      if (proj?.style_sample) styleSample = proj.style_sample;
    }

    // 构建润色指令
    const genreTemplate = genre ? buildWritingSystemPrompt(genre) : "";
    let system = `你是网文润色编辑。核心任务：去掉AI味，让文字像人写的。具体规则：

【必须做的】
- 打破排比句式、减少"不是...而是..."等书面结构
- 拆分长句为短句，两句以上的复杂句必须拆开
- 增加口语化表达，对话要自然
- 删除冗余修饰词和强行四字词
- 保持原意、情节、人物性格不变

【禁止做的】
- 不要增加原文没有的情节或信息
- 不要改变原文的节奏和风格
- 不要过度润色导致内容失真
- 不要删除重要对话和细节

【各题材风格要求】
- 玄幻/仙侠：保留修炼体系术语，语言可略带古风
- 都市：语言现代自然，接近生活口语
- 言情：情感描写细腻自然，不过度煽情
- 科幻/游戏：专业术语准确，叙述简洁
- 历史：符合朝代语感，不出现现代词汇
- 其他题材：保持原题材的语言风格即可

${styleSample ? `\n【文风参考——请严格模仿以下文字的句式、节奏和描写风格】\n${styleSample.slice(0, 2000)}` : ""}
${genreTemplate}`;

    const result = await aiChat(system, `以下是一段网文内容，请按上述规则润色，去掉AI味，保持原意不变：\n\n${text}`);

    if (paidUserId) {
      const wordsUsed = countTextWords(result);
      await deductWords(paidUserId, wordsUsed, "polish");
    } else {
      incrementCount(req);
    }

    return Response.json({ result });
  } catch (error: any) {
    console.error("[AI润色]", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
