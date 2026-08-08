import { NextRequest } from "next/server";
import { aiChatStream } from "@/lib/ai";
import { checkQuotaOrError, withBillingStream } from "@/lib/billing";
import { buildStyleIronRules } from "@/lib/craft";

// 按体检报告一键改稿：AI 五层体检 → 本接口按报告逐条修改 → 输出完整修订版
export async function POST(req: NextRequest) {
  try {
    const { paidUserId, errorResponse } = await checkQuotaOrError(req);
    if (errorResponse) return errorResponse;

    const { text, report, projectId, genre } = await req.json();
    if (!text || !report) return Response.json({ error: "需要正文和体检报告" }, { status: 400 });
    if (text.replace(/\s/g, "").length < 100) {
      return Response.json({ error: "正文太短，无法改稿" }, { status: 400 });
    }

    // 角色清单 + 文风样本
    let charsText = "";
    let styleSample = "";
    if (projectId) {
      const { supabase } = await import("@/lib/supabase");
      const { data: chars } = await supabase
        .from("characters")
        .select("name, description, traits")
        .eq("project_id", projectId)
        .limit(30);
      if (chars?.length) {
        charsText = chars.map((c: any) => `- ${c.name}：${c.description || ""}`).join("\n");
      }
      const { data: proj } = await supabase
        .from("projects")
        .select("style_sample")
        .eq("id", projectId)
        .single();
      if (proj?.style_sample) styleSample = proj.style_sample;
    }

    const system = `你是番茄平台的资深改稿编辑。根据体检报告修改本章正文，把报告里每条问题都落实到文字。

【改稿铁律】
- 忠实原文：人物、情节走向、关键事件、章节结构一律不变，只改表达和逻辑
- 逐条落实报告中的 P0/P1/P2 问题；报告没提的地方不要大改
- 修复逻辑问题用最小改动，能一句话顺过去就不重写整段
- 输出修改后的完整章节全文（不是片段、不是只列修改点、不要解释过程）
- 保持原风格和节奏
${styleSample ? `\n【文风参考——严格模仿以下文字的句式、节奏和描写风格】\n${styleSample.slice(0, 3000)}` : ""}
${charsText ? `\n【本书角色清单——对话和言行必须贴合人设】\n${charsText}` : ""}
${genre ? `\n题材：${genre}` : ""}

【文风铁律】
${buildStyleIronRules()}`;

    const user = `【体检报告】\n${report.slice(0, 4000)}\n\n【待修改章节全文】\n${text}`;

    let stream = await aiChatStream(system, user, { temperature: 0.4, max_tokens: 8192 });

    if (paidUserId) {
      stream = withBillingStream(stream, paidUserId, "revise");
    }

    return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
  } catch (error: any) {
    console.error("[按报告改稿]", error.message);
    return Response.json({ error: error.message || "改稿失败" }, { status: 500 });
  }
}
