import { NextRequest } from "next/server";
import { aiChat } from "@/lib/ai";
import { checkFreeLimit, incrementCount } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const limit = await checkFreeLimit(req);
  if (!limit.allowed) {
    return Response.json({ error: limit.error, needLogin: true }, { status: 429 });
  }

  try {
    const { idea, genre, outline } = await req.json();
    if (!idea && !outline) return Response.json({ error: "请先输入思路或生成大纲" }, { status: 400 });

    const system = `你是番茄小说平台的爆款书名策划师。请根据以下小说信息，生成5个番茄风格的爆款书名。

番茄书名规则：
- 8-15字，短小有力
- 带动作/冲突/身份/反转关键词
- 有"钩子感"——让人想点开
- 示例风格：《穿越1978：傻柱不傻了》《林家名门之后，不装了》《回乡挖出大明宝藏》《我被赶出北漂，爷爷让我继承王位》

请直接输出5个书名，每行一个，不要编号，不要解释。`;

    const text = await aiChat(system, `题材：${genre}\n思路：${idea}\n大纲摘要：${(outline || "").slice(0, 1000)}`, { temperature: 0.9, max_tokens: 500 });
    incrementCount(req);
    const titles = text.split("\n").filter((l: string) => l.trim().length > 2).slice(0, 5);

    return Response.json({ titles: titles.length > 0 ? titles : ["未能生成，请手动输入"] });
  } catch (error: any) {
    console.error("[AI书名]", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
