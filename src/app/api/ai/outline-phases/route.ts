import { NextRequest } from "next/server";
import { aiChat } from "@/lib/ai";
import { incrementCount } from "@/lib/rate-limit";
import { checkQuotaOrError, countTextWords, deductWords } from "@/lib/billing";
import { buildOutlineSystemPrompt } from "@/lib/templates";

export async function POST(req: NextRequest) {
  try {
    const { paidUserId, errorResponse } = await checkQuotaOrError(req);
    if (errorResponse) return errorResponse;

    const { genre, idea, wordCount, volumeIndex, volumeName, volumeSummary, chapterRange } = await req.json();
    if (!genre || !idea) return Response.json({ error: "参数不完整" }, { status: 400 });

    // 解析章节范围，算出阶段数
    let numPhases = 4;
    let chStart = 1, chEnd = 30;
    if (chapterRange) {
      const parts = chapterRange.split("-");
      if (parts.length === 2) {
        const s = parseInt(parts[0]), e = parseInt(parts[1]);
        if (!isNaN(s) && !isNaN(e) && e >= s) { chStart = s; chEnd = e; }
      }
    }
    // 每阶段覆盖约8-12章 → 每卷分3-5阶段
    const chCount = chEnd - chStart + 1;
    numPhases = Math.max(3, Math.min(5, Math.round(chCount / 10)));

    const basePrompt = buildOutlineSystemPrompt(genre, wordCount);

    const system = `${basePrompt}

目标：为一部${wordCount}万字的${genre}小说，生成第${volumeIndex}卷《${volumeName}》的阶段性划分。

本卷是五卷结构中的第${volumeIndex}卷，对应：${["开局", "发展", "高潮", "转折", "结局"][volumeIndex - 1] || ""}阶段。

本卷概况：${volumeSummary || ""}
本卷章节范围：第${chStart}-${chEnd}章（共${chCount}章）
阶段数：${numPhases}个阶段

第三层：阶段划分（严格按照以下格式，每阶段一行，用|分隔）：
阶段号 | 阶段名 | 核心冲突/进展（20字以内） | 包含章节范围

例如：
1 | 初入职场 | 主角进入新环境，建立人脉 | ${chStart}-${chStart + 9}
2 | 遭遇危机 | 竞争对手打压，主角面临第一场恶战 | ${chStart + 10}-${chStart + 19}

要求：
- 每个阶段是1个完整的故事单元，有明确的起承转合
- 阶段名要体现冲突和变化，不能是中性描述
- 章节数在各阶段均匀分配
- 第1阶段前3章必须有爽点
- 最后1阶段要有卷尾高潮和通往下卷的钩子`;

    const user = `题材：${genre}。核心思路：${idea}。
第${volumeIndex}卷：${volumeName}（对应整部小说的${["开局", "发展", "高潮", "转折", "结局"][volumeIndex - 1] || ""}阶段）
${volumeSummary ? `本卷核心：${volumeSummary}` : ""}
章节范围：第${chStart}-${chEnd}章。请生成${numPhases}个阶段，每个阶段包含明确的起承转合。`;

    const result = await aiChat(system, user, { max_tokens: 2048, temperature: 0.8 });

    const lines = result.split("\n").filter(l => /^\d+\s*\|/.test(l.trim()));
    let phases = lines.map((line, idx) => {
      const parts = line.split("|").map(s => s.trim());
      return {
        index: idx + 1,
        name: parts[1] || `阶段${idx + 1}`,
        summary: parts[2] || "",
        chapterRange: parts[3] || "",
      };
    });

    // Fallback：按"阶段"/"Stage"或关键词分段
    if (phases.length === 0) {
      const phaseLines = result.split("\n").filter(l => /阶段|第.{1,5}阶段/.test(l));
      if (phaseLines.length > 0) {
        phases = phaseLines.map((line, idx) => {
          const name = line.replace(/^[\d\s.、）\)]*/, "").trim();
          return { index: idx + 1, name, summary: "", chapterRange: "" };
        });
      }
    }

    // 最终fallback：按两个换行分段
    if (phases.length === 0) {
      const sections = result.split("\n\n").filter(s => s.trim().length > 5);
      if (sections.length >= 2) {
        phases = sections.map((sec, idx) => ({
          index: idx + 1,
          name: sec.trim().split("\n")[0] || `阶段${idx + 1}`,
          summary: "",
          chapterRange: "",
        }));
      }
    }

    if (phases.length === 0) {
      return Response.json({ error: "AI返回格式异常，请重试", raw: result }, { status: 422 });
    }

    if (paidUserId) {
      const wordsUsed = countTextWords(result);
      await deductWords(paidUserId, wordsUsed, "outline");
    } else {
      incrementCount(req);
    }

    return Response.json({ phases });

  } catch (error: any) {
    console.error("[生成阶段大纲]", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
