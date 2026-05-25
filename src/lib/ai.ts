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

// AI润色（非流式）
export async function polishText(text: string, styleSample?: string) {
  let system = "你是网文润色编辑。核心要求：节奏紧凑、画面感强、代入感足。去掉AI味——打破排比、加口语化、减'不是...而是...'句式、对话更自然。保持原意不变。";
  if (styleSample) {
    system += `\n\n请严格模仿以下文风样本的句式和节奏来润色：\n${styleSample.slice(0, 2000)}`;
  }
  return aiChat(system, `润色以下内容：\n${text}`);
}
