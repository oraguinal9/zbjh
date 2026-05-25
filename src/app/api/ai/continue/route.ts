import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { aiChatStream } from "@/lib/ai";
import { incrementCount } from "@/lib/rate-limit";
import { checkQuotaOrError, withBillingStream } from "@/lib/billing";

export async function POST(req: NextRequest) {
  try {
    const { paidUserId, errorResponse } = await checkQuotaOrError(req);
    if (errorResponse) return errorResponse;
    const { projectId, chapterId, title, genre, content, outline, targetWords = 2500 } = await req.json();
    if (!outline) return Response.json({ error: "章纲不能为空" }, { status: 400 });

    // ===== 1. 获取前文上下文（按项目过滤） =====
    let contextChunks = "";
    if (projectId && chapterId) {
      const { data: volumes } = await supabase
        .from("volumes")
        .select("id")
        .eq("project_id", projectId);
      const volIds = (volumes || []).map((v: any) => v.id);
      if (volIds.length > 0) {
        const { data: allChapters } = await supabase
          .from("chapters")
          .select("id, title, content, summary, sort_order, volume_id")
          .in("volume_id", volIds)
          .order("sort_order");

        if (allChapters && allChapters.length > 0) {
          const curIdx = allChapters.findIndex((c: any) => c.id === chapterId);
          const prev = allChapters.slice(Math.max(0, curIdx - 3), curIdx);

          // 全部前章的剧情摘要（全局剧情记忆）
          const prevAll = allChapters.slice(0, curIdx);
          const summaries = prevAll
            .filter((ch: any) => ch.summary?.trim())
            .map((ch: any) => `第${ch.sort_order}章《${ch.title}》：${ch.summary}`);
          const summaryBlock = summaries.length > 0
            ? `【整体剧情回顾（共${summaries.length}章）】\n${summaries.join("\n")}\n\n`
            : "";

          if (prev.length > 0) {
            // 前三章上下文：最近一章取2000字，中间取500字，最远取300字
            const limits = [300, 500, 2000];
            contextChunks = summaryBlock + prev.map((ch: any, i: number) => {
              const limit = limits[i] || 2000;
              return `【前章：《${ch.title}》${i === prev.length - 1 ? "全文摘要" : "结尾"}】${(ch.content || "").slice(-limit)}`;
            }).join("\n\n");
          } else if (summaryBlock) {
            contextChunks = summaryBlock;
          }

          if (curIdx >= 0 && allChapters[curIdx]) {
            const currentVol = allChapters[curIdx].volume_id;
            const volChapters = allChapters.filter((c: any) => c.volume_id === currentVol);
            const volOutlines = volChapters.map((c: any) => `第${c.sort_order}章纲要：${c.title}`).join("\n");
            if (volOutlines) contextChunks += `\n\n【本卷各章纲要】\n${volOutlines}`;
          }
        }
      }
    }

    // ===== 2. 获取角色信息 =====
    let characterInfo = "";
    if (projectId) {
      const { data: chars } = await supabase
        .from("characters")
        .select("name, description, traits")
        .eq("project_id", projectId);

      if (chars && chars.length > 0) {
        characterInfo = chars.map((c: any) =>
          `${c.name}：${c.description || ""}。性格特征：${c.traits ? JSON.stringify(c.traits) : "暂无"}`
        ).join("\n");
      }
    }

    // ===== 3. 获取文风样本 =====
    let styleSample = "";
    if (projectId) {
      const { data: proj } = await supabase
        .from("projects")
        .select("style_sample")
        .eq("id", projectId)
        .single();
      if (proj?.style_sample) styleSample = proj.style_sample;
    }

    // ===== 4. 构建提示词并调用AI =====
    const system = `你是番茄平台的爆款网文写手。输出必须遵循以下铁律：

【核心原则】
- 主角必须主动、强势、不憋屈。前10章主角不能受重伤或濒死，嘴炮不能输
- 每章只推进1-2个核心事件，不要堆砌内容
- 对话占比60%以上，多用短句、嘴炮、心理活动，不要大段旁白
- 每章前1/3必须有爽点或回馈，不能拖到章末才给
- 章尾必须有钩子（悬念、反转、新威胁、身份揭露等）
- 系统/金手指每次只引入1个新机制，不要一次性抛出多个设定
- 配角出场要有合理动机和前因，不能凭空降临

【节奏要求】
- 1章只做1件事：要么打脸、要么推进感情、要么获得新能力、要么解开悬念
- 爽点 > 虐点：主角可以遇到困难，但必须立刻找到办法反击，不能长期被动
- 字数控制在2000-2500字，不超不长

【描写要求】
- 多用行动和对话表达情感，不用大段心理描写
- 短句为主，不要排比句、不要华丽形容词
- 画面感强：时间+地点+动作+对话，快速推进
- 人物性格通过说话方式和行为区分，不要标签化

${characterInfo ? `\n【角色设定】\n${characterInfo}\n请严格保持角色性格和说话风格一致。` : ""}
${styleSample ? `\n【文风参考——请严格模仿以下文字的句式、节奏和描写风格】\n${styleSample.slice(0, 2000)}` : ""}`;

    const user = `作品：《${title || "未命名"}》（${genre || "都市"}）

${contextChunks ? `【前文回顾】\n${contextChunks}\n` : ""}
【当前任务】续写本章内容。
章纲：${outline}
目标字数：${targetWords}字左右。

要求：
- 承接前文风格和剧情，保持主角人设一致
- 主角要主动推进剧情，快速进入冲突
- 章尾必须有钩子
- 如果章纲写了多个事件，优先写第一个事件，其余留到后续章节处理
- 本章结尾的钩子必须自然衔接下一次续写，不能断层
${content ? `\n【当前已写内容（请从末尾续写）】\n${content.slice(-500)}` : ""}`;

    let stream = await aiChatStream(system, user);

    if (paidUserId) {
      stream = withBillingStream(stream, paidUserId, "continue");
    } else {
      incrementCount(req);
    }

    return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
  } catch (error: any) {
    console.error("[AI续写]", error.message);
    return Response.json({ error: error.message || "续写失败" }, { status: 500 });
  }
}
