// 管理员通知（Bark 推送，iPhone）
// 配置：服务器 .env.local 里加 BARK_KEY=你的DeviceKey，未配置时不发送
export async function notifyAdmin(title: string, body: string) {
  const key = process.env.BARK_KEY;
  if (!key) return;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    await fetch("https://api.day.app/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        device_key: key,
        title,
        body,
        group: "执笔惊鸿",
        level: "active",
        sound: "alarm",
      }),
      signal: controller.signal,
    }).catch(() => {});
    clearTimeout(timer);
  } catch {}
}
