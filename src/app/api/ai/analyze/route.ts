import { NextRequest } from "next/server";
import { aiChatStream } from "@/lib/ai";
import { checkFreeLimit, incrementCount } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const limit = await checkFreeLimit(req);
  if (!limit.allowed) {
    return Response.json({ error: limit.error, needLogin: true }, { status: 429 });
  }

  try {
    const { bookName, text } = await req.json();
    if (!bookName) return Response.json({ error: "请输入书名" }, { status: 400 });
    const hasText = text && text.length > 100;

    const system = `你是资深网文结构分析师。请深度拆解《${bookName}》的结构方法论。
${hasText ? "以下附有原文片段供分析。" : "如果你没读过这本书，请根据书名和题材名称推测它的结构模式，给出同类型作品的通用结构分析。不要只说'未收录'，要给出有用的分析。"}

按以下格式输出：

## 📖 《${bookName}》深度拆解

## 一、核心爽点模式（至少3个，附案例）
## 二、节奏规律（字数/爽点间隔/钩子类型）
## 三、人设公式（主角类型/反派规律/配角功能）
## 四、可复用的结构模板（按卷拆解）
## 五、同风格新书建议（题材+五卷大纲）`;

    const stream = await aiChatStream(system, hasText ? `分析以下片段：\n\n${text.slice(0, 8000)}` : `拆解《${bookName}》。`);
    incrementCount(req);
    return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
  } catch (error: any) {
    console.error("[AI拆书]", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
