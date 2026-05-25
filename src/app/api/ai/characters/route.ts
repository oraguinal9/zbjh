import { NextRequest } from "next/server";
import { supabase, getCurrentUser } from "@/lib/supabase";
import { aiChat } from "@/lib/ai";
import { incrementCount } from "@/lib/rate-limit";
import { checkQuotaOrError, countTextWords, deductWords } from "@/lib/billing";

export async function POST(req: NextRequest) {
  try {
    const { paidUserId, errorResponse } = await checkQuotaOrError(req);
    if (errorResponse) return errorResponse;

    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "请先登录" }, { status: 401 });

    const { projectId, genre, outline } = await req.json();
    if (!outline) return Response.json({ error: "大纲内容不能为空" }, { status: 400 });

    // Verify project ownership
    const { data: project } = await supabase.from("projects").select("id").eq("id", projectId).eq("user_id", user.id).single();
    if (!project) return Response.json({ error: "作品不存在" }, { status: 404 });

    const system = `You are a character designer for web novels. Extract all major characters from the outline and output in this exact format:

NAME: CharacterName
ROLE: protagonist/antagonist/support
DESC: Brief description including appearance, personality, and role in story

Rules:
- Use NAME: ROLE: DESC: for each character
- Put protagonist first
- Separate characters with --- on its own line
- Output ONLY the character data, no explanations

Example:
NAME: Lin Yuan
ROLE: protagonist
DESC: 22-year-old delivery worker, calm and determined. Gains ancient sword power.

---
NAME: Su Qingqian
ROLE: female lead
DESC: 19-year-old blind girl, gentle and resilient. Secret inheritor of forbidden arts.`;

    const text = await aiChat(system, `Genre: ${genre}\nOutline:\n${outline.slice(0, 5000)}`, { max_tokens: 2048 });

    if (paidUserId) {
      await deductWords(paidUserId, countTextWords(text), "characters");
    } else {
      incrementCount(req);
    }

    // Parse ASCII format: split by "---"
    const blocks = text.split(/^---$/m);
    const characters: any[] = [];

    for (const block of blocks) {
      const nameMatch = block.match(/^NAME:\s*(.+)$/m);
      const descMatch = block.match(/^DESC:\s*(.+)$/m);
      if (!nameMatch || !descMatch) continue;

      const name = nameMatch[1].trim();
      const desc = descMatch[1].trim();

      if (!name || name.length > 30 || desc.length < 2) continue;

      const { data } = await supabase
        .from("characters")
        .insert({ project_id: projectId, name, description: desc, traits: {} })
        .select().single();
      if (data) characters.push(data);
    }

    if (characters.length === 0) {
      return Response.json({ error: "未能从大纲中提取到角色", raw: text }, { status: 400 });
    }

    return Response.json({ characters, raw: text });
  } catch (error: any) {
    console.error("[AI角色]", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
