import { NextRequest } from "next/server";
import { aiChat } from "@/lib/ai";
import { incrementCount } from "@/lib/rate-limit";
import { checkQuotaOrError, countTextWords, deductWords } from "@/lib/billing";

export async function POST(req: NextRequest) {
  try {
    const { paidUserId, errorResponse } = await checkQuotaOrError(req);
    if (errorResponse) return errorResponse;

    const { genre, idea, wordCount } = await req.json();
    if (!genre || !idea) return Response.json({ error: "题材和思路不能为空" }, { status: 400 });

    const totalChapters = Math.round(wordCount * 5); // 每章2000字

    const system = `你是番茄小说平台的资深大纲策划师，专精爆款网文结构。

目标：为一部${wordCount}万字的${genre}长篇小说生成完整大纲。

输出分为两部分，用"=====五卷结构====="分隔：

第一部分：总体大纲（全面概述整部小说）：
- 故事背景与世界观（前10章只展示20%，留到后面慢慢展开）
- 主角人设与成长弧线（必须有标志性性格标签，如嘴炮/护短/精算师）
- 核心冲突主线
- 五个阶段的起承转合概述

第二部分：五卷结构（严格按照以下格式）：
卷号 | 卷名 | 核心剧情概括（30字以内） | 本章起止章节

例如：
1 | 开局风云 | 主角穿越到1978年，从零开始创业 | 1-30
2 | 崛起之路 | 商场上崭露头角，遇到第一个劲敌 | 31-60

【设计铁律】
- 5卷分别对应：开局→发展→高潮→转折→结局
- 第1卷主角必须强势建立优势，不能长期憋屈
- 每卷前3章就要有爽点，不要铺垫太久
- 总章节数约${totalChapters}章，5卷均匀分配
- 世界观设定按卷逐步释放，不要在第1卷堆砌
- 配角要有成长线和独立动机，不能当工具人
- 整体脉络要撑得起${wordCount}万字的篇幅
- 最后一行输出"主角成长线：..."`;

    const user = `题材：${genre}。核心思路：${idea}。目标字数：${wordCount}万字。请先生成总体大纲，再生成5卷结构。`;
    const result = await aiChat(system, user, { max_tokens: 4096, temperature: 0.8 });

    // 分割总体大纲和五卷结构
    let overallOutline = "";
    let volPart = result;
    const sep = "=====五卷结构=====";
    const sepIdx = result.indexOf(sep);
    if (sepIdx !== -1) {
      overallOutline = result.slice(0, sepIdx).trim();
      volPart = result.slice(sepIdx + sep.length).trim();
    }

    // 先提取成长线并从 volPart 移除，防止被解析为卷
    const growthLines = volPart.split("\n").filter(l => l.includes("成长线"));
    const growthLine = growthLines[0] || "";
    if (growthLines.length > 0) {
      for (const gl of growthLines) {
        volPart = volPart.replace(gl, "");
      }
    }

    const lines = volPart.split("\n").filter(l => /^\d+\s*\|/.test(l.trim()));
    let volumes = lines.map((line, idx) => {
      const parts = line.split("|").map(s => s.trim());
      return {
        index: idx + 1,
        name: parts[1] || `第${idx + 1}卷`,
        summary: parts[2] || "",
        chapterRange: parts[3] || "",
      };
    });

    // Fallback：如果|格式解析失败，尝试按"第X卷"关键词提取
    if (volumes.length === 0) {
      const volLines = volPart.split("\n").filter(l => /第[一二三四五六七八九十]+卷/.test(l));
      if (volLines.length > 0) {
        volumes = volLines.map((line, idx) => {
          const name = line.replace(/^[\d\s.、）\)]*/, "").trim();
          return { index: idx + 1, name, summary: "", chapterRange: "" };
        });
      }
    }

    // 最终fallback：按===或---或空行分段，每段作为一卷
    if (volumes.length === 0) {
      const sections = volPart.split(/\n={2,}\n|\n-{2,}\n|\n\n{2,}/).filter(s => s.trim().length > 10);
      if (sections.length >= 3) {
        volumes = sections.map((sec, idx) => {
          const firstLine = sec.trim().split("\n")[0];
          return { index: idx + 1, name: firstLine || `第${idx + 1}卷`, summary: "", chapterRange: "" };
        });
      }
    }

    // 实在解析不出来，构建默认卷
    if (volumes.length === 0) {
      const defaultNames = ["开局风云", "崭露头角", "风云激荡", "绝地反击", "终章"];
      volumes = defaultNames.map((n, i) => ({ index: i + 1, name: n, summary: "", chapterRange: "" }));
    }

    if (paidUserId) {
      const wordsUsed = countTextWords(result);
      await deductWords(paidUserId, wordsUsed, "outline");
    } else {
      incrementCount(req);
    }

    return Response.json({ volumes, growthLine, overallOutline, totalChapters });

  } catch (error: any) {
    console.error("[生成卷级大纲]", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
