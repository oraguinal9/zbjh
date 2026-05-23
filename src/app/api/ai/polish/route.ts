import { NextRequest } from "next/server";
import { polishText } from "@/lib/ai";
import { checkFreeLimit, incrementCount } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const limit = await checkFreeLimit(req);
  if (!limit.allowed) {
    return Response.json({ error: limit.error, needLogin: true }, { status: 429 });
  }

  try {
    const { text } = await req.json();
    if (!text) return Response.json({ error: "内容不能为空" }, { status: 400 });
    const result = await polishText(text);
    incrementCount(req);
    return Response.json({ result });
  } catch (error: any) {
    console.error("[AI润色]", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
