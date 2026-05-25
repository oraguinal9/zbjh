import { NextRequest } from "next/server";
import { aiChatStream } from "@/lib/ai";
import { incrementCount } from "@/lib/rate-limit";
import { checkQuotaOrError, withBillingStream } from "@/lib/billing";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { paidUserId, errorResponse } = await checkQuotaOrError(req);
    if (errorResponse) return errorResponse;

    const { genre, idea, wordCount, volumeIndex, volumeName, chapterRange, overallContext, projectId } = await req.json();
    if (!genre || !idea) return Response.json({ error: "参数不完整" }, { status: 400 });

    // 解析章节范围，如果客户端没传则查数据库兜底
    let numChapters = 10;
    let effectiveRange = chapterRange;
    if (!effectiveRange && projectId) {
      const { data: proj } = await supabase.from("projects").select("outline").eq("id", projectId).single();
      if (proj?.outline) {
        const sections = proj.outline.split(/【第\d+卷完】/);
        const idx = (volumeIndex || 1) - 1;
        const sec = sections[idx];
        if (sec) {
          const m = sec.match(/章节范围[：:]\s*(\d+-\d+)/);
          if (m) effectiveRange = m[1];
        }
      }
    }
    if (effectiveRange) {
      const parts = effectiveRange.split("-");
      if (parts.length === 2) {
        const s = parseInt(parts[0]), e = parseInt(parts[1]);
        if (!isNaN(s) && !isNaN(e) && e >= s) { numChapters = e - s + 1; }
      }
    }

    const system = `你是番茄小说平台的资深网文策划师，专精爆款节奏。

${overallContext ? `【全书背景】\n${overallContext}\n\n` : ""}目标：为${wordCount}万字${genre}小说生成第${volumeIndex}卷《${volumeName}》的逐章章卡。

本卷共${numChapters}章，从第1章开始编号。

严格按照以下格式输出每章的章卡，用"---"分隔不同章节：

---
## 第1章：章名

**核心事件**：（本章只做1件事，用一句话写清）
**爽点**：（读者最爽的点，如打脸、逆袭、装逼、揭秘、获得新能力等）
**情感点**：（读者情绪共鸣的点，如感动、愤怒、期待等）
**章末钩子**：（本章结尾的悬念或反转，吸引读者下一章）
**字数建议**：2000-2500字

【铁律——必须遵守】
- ⚠️ 核心事件只能写1个情节动作，禁止出现"和""并""同时""随后"等并列词
- 每章只做1件事：打脸/升级/恋爱/解谜四选一
- 主角前5章必须强势，不能受重伤、不能濒死、不能长期被动
- 每章前1/3就要有爽点，不能铺垫到章末
- 前10章总共只展示2-3个核心机制，不堆砌设定
- 配角第1次出场只给动机，第2次出场才给反转
- 每章必须有一个明确的钩子
- **每一章的开头场景，必须承接上一章的章末钩子**，不能跳场景

【反面案例——严禁效仿】
❌ 错误示例（核心事件塞了3件事）：
"主角参加拍卖会→遇到仇家挑衅→用新能力打脸"

✅ 正确示例（核心事件只做1件事）：
"主角在拍卖会上用100万拍到隐藏法宝，全场震惊"

【全卷事件预算】
全卷${numChapters}章，总共只能设计${Math.floor(numChapters * 1.2)}个以下的主要情节事件。平均每章1个事件，少量章节可预留铺垫章节。禁止堆砌。`;

    const user = `题材：${genre}。核心思路：${idea}。
第${volumeIndex}卷《${volumeName}》
本卷共${numChapters}章，从第1章开始顺序编号。请为这${numChapters}章逐一生成章卡。注意：每章核心事件只写1件事，不允许并列。第1章的开头承接故事开篇，从第2章开始每章开头必须承接上一章的结尾钩子。`;

    const maxTokens = Math.min(numChapters * 350, 12000);
    let stream = await aiChatStream(system, user, { max_tokens: maxTokens, temperature: 0.8 });

    if (paidUserId) {
      stream = withBillingStream(stream, paidUserId, "outline");
    } else {
      incrementCount(req);
    }

    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (error: any) {
    console.error("[生成章卡]", error.message);
    return Response.json({ error: error.message || "生成失败" }, { status: 500 });
  }
}
