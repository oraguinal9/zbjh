const API_KEY = process.env.AI_API_KEY;
if (!API_KEY) throw new Error("缺少环境变量: AI_API_KEY，请在 .env.local 中配置 DeepSeek API Key");
const API_BASE = process.env.AI_API_BASE || "https://api.deepseek.com";
const AI_MODEL = process.env.AI_MODEL || "deepseek-chat";
const AI_TIMEOUT = 60000;

async function fetchAI(url: string, options: RequestInit & { signal?: AbortSignal }): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timeout);
  }
}

// 解析SSE流，提取纯文本内容
function parseSSEStream(body: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  return new ReadableStream({
    async start(controller) {
      const reader = body.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) { controller.close(); break; }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6).trim();
              if (data === "[DONE]") { controller.close(); return; }
              try {
                const json = JSON.parse(data);
                const content = json.choices?.[0]?.delta?.content;
                if (content) controller.enqueue(encoder.encode(content));
              } catch {}
            }
          }
        }
      } catch (e) {
        controller.error(e);
      }
    },
  });
}

// 通用非流式请求
export async function aiChat(system: string, user: string, options?: { max_tokens?: number; temperature?: number }): Promise<string> {
  const res = await fetchAI(`${API_BASE}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({
      model: AI_MODEL,
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      max_tokens: options?.max_tokens ?? 4096,
      temperature: options?.temperature ?? 0.8,
    }),
  });

  if (!res.ok) throw new Error(`AI请求失败: ${res.status}`);
  const json: { choices?: { message?: { content?: string } }[] } = await res.json();
  return json.choices?.[0]?.message?.content || "";
}

// 通用流式请求
export async function aiChatStream(system: string, user: string, options?: { max_tokens?: number; temperature?: number }): Promise<ReadableStream<Uint8Array>> {
  const res = await fetchAI(`${API_BASE}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({
      model: AI_MODEL, stream: true,
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      max_tokens: options?.max_tokens ?? 4096,
      temperature: options?.temperature ?? 0.8,
    }),
  });

  if (!res.ok) throw new Error(`AI请求失败: ${res.status}`);
  return parseSSEStream(res.body!);
}

// 大纲生成（流式）
export async function generateOutline(genre: string, idea: string, wordCount: number) {
  const system = `你是番茄小说平台的资深大纲策划师，专精爆款网文结构。
写作要求：节奏紧凑、爽点密集、反转自然、画面感强、代入感足。

输出格式必须严格遵循以下规则（极其重要）：
- 五卷结构，每卷必须标注"第一卷：卷名"
- 每卷包含12章，每章必须标注"第X章：章名 - 核心事件"（章号从1开始连续编号）
- 例如："第1章：穿越醒来 - 主角发现自己穿越到1978年"
- 每卷结尾标注"【第一卷完】"
- 最后附主角成长线

要求：章名要有故事感，核心事件要具体，不要空泛描述。`;
  const user = `题材：${genre}。核心思路：${idea}。目标字数：${wordCount}万字。请生成完整细纲。`;

  const res = await fetchAI(`${API_BASE}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({ model: AI_MODEL, messages: [{ role: "system", content: system }, { role: "user", content: user }], max_tokens: 4096, temperature: 0.8, stream: true }),
  });

  if (!res.ok) throw new Error(`AI请求失败: ${res.status}`);
  return parseSSEStream(res.body!);
}

// AI润色（非流式）
export async function polishText(text: string) {
  const system = "你是网文润色编辑。核心要求：节奏紧凑、画面感强、代入感足。去掉AI味——打破排比、加口语化、减'不是...而是...'句式、对话更自然。保持原意不变。";
  return aiChat(system, `润色以下内容：\n${text}`);
}
