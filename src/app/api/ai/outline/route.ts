import { NextRequest } from "next/server";
import { generateOutline } from "@/lib/ai";
import { checkFreeLimit, incrementCount } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const limit = await checkFreeLimit(req);
  if (!limit.allowed) {
    return Response.json({ error: limit.error, needLogin: true }, { status: 429 });
  }

  try {
    const { genre, idea, wordCount } = await req.json();
    if (!genre || !idea) return Response.json({ error: "题材和思路不能为空" }, { status: 400 });

    const stream = await generateOutline(genre, idea, wordCount || 80);
    incrementCount(req);
    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (error: any) {
    console.error("[AI大纲]", error.message);
    return Response.json({ error: error.message || "生成失败" }, { status: 500 });
  }
}
