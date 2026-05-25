import { NextRequest } from "next/server";
import { polishText } from "@/lib/ai";
import { incrementCount } from "@/lib/rate-limit";
import { checkQuotaOrError, countTextWords, deductWords } from "@/lib/billing";

export async function POST(req: NextRequest) {
  try {
    const { paidUserId, errorResponse } = await checkQuotaOrError(req);
    if (errorResponse) return errorResponse;

    const { text, projectId } = await req.json();
    if (!text) return Response.json({ error: "内容不能为空" }, { status: 400 });

    // 获取文风样本
    let styleSample = "";
    if (projectId) {
      const { supabase } = await import("@/lib/supabase");
      const { data: proj } = await supabase.from("projects").select("style_sample").eq("id", projectId).single();
      if (proj?.style_sample) styleSample = proj.style_sample;
    }

    const result = await polishText(text, styleSample);

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
