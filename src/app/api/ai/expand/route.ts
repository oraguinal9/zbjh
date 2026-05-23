import { NextRequest } from "next/server";
import { aiChat } from "@/lib/ai";
import { checkFreeLimit, incrementCount } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const limit = await checkFreeLimit(req);
  if (!limit.allowed) {
    return Response.json({ error: limit.error, needLogin: true }, { status: 429 });
  }

  try {
    const { text, targetWords } = await req.json();
    if (!text) return Response.json({ error: "内容不能为空" }, { status: 400 });

    const currentWords = text.replace(/\s/g, "").length;
    if (targetWords && targetWords <= currentWords) {
      return Response.json({ error: "目标字数必须大于当前字数" }, { status: 400 });
    }

    incrementCount(req);

    const system = `你是网文扩写专家。在保持原意、风格和情节走向不变的前提下，丰富细节、对话、心理描写和环境描写，达到目标字数。

要求：
- 保持原文的人称、语气、风格完全一致
- 增加细节描写：环境、动作、神态、心理
- 对话自然，可适当增加对话轮次
- 不要改变情节走向和关键事件
- 不要添加新角色或支线情节
- 输出完整的扩写后内容，不要省略`;

    const result = await aiChat(system, `原文：\n${text}\n\n当前字数约${currentWords}字，请扩展到约${targetWords}字。保持风格一致。`, { max_tokens: 4096, temperature: 0.7 });
    return Response.json({ result });
  } catch (error: any) {
    console.error("[AI补字数]", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
