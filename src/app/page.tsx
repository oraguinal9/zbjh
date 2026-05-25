"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { authFetch, getToken, signOut as doSignOut } from "@/lib/auth";
import { useRouter } from "next/navigation";

async function readStream(res: Response, onChunk: (text: string) => void): Promise<void> {
  const reader = res.body?.getReader();
  if (!reader) { onChunk(await res.text()); return; }
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    onChunk(decoder.decode(value, { stream: true }));
  }
}

interface Volume {
  index: number; name: string; summary: string; chapterRange: string;
}
export default function Home() {
  const router = useRouter();
  const [tab, setTab] = useState<"create" | "analyze">("create");
  const [userEmail, setUserEmail] = useState("");
  // 创作输入
  const [genre, setGenre] = useState("都市");
  const [idea, setIdea] = useState("");
  const [title, setTitle] = useState("");
  const [wordCount, setWordCount] = useState(80);
  // 三级大纲状态
  const [volumes, setVolumes] = useState<Volume[]>([]);
  const [overallOutline, setOverallOutline] = useState("");
  const [growthLine, setGrowthLine] = useState("");
  const [genVolLoading, setGenVolLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [titleOptions, setTitleOptions] = useState<string[]>([]);
  const [needLogin, setNeedLogin] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = getToken();
    if (!t) return;
    authFetch("/api/auth/me").then(r => r.json()).then(d => {
      if (d.email) setUserEmail(d.email);
    }).catch(() => {});
    fetch("/api/payment/balance")
      .then(r => r.json()).then(d => setBalance(d.remaining_words ?? 0)).catch(() => {});
  }, [router]);

  // 拆书
  const [bookName, setBookName] = useState("");
  const [bookText, setBookText] = useState("");
  const [bookGenre, setBookGenre] = useState("都市");
  const [analysis, setAnalysis] = useState("");
  const [analyzeLoading, setAnalyzeLoading] = useState(false);

  const handleRateLimited = async (res: Response) => {
    if (res.status === 429 || res.status === 402) {
      const data = await res.json().catch(() => ({}));
      if (data.needRecharge) { alert("余额不足，请充值"); router.push("/recharge"); return true; }
      if (data.needLogin) { setNeedLogin(true); return true; }
    }
    return false;
  };

  // 第一步：生成5卷
  const handleGenerateVolumes = async () => {
    if (!idea.trim()) return;
    setGenVolLoading(true); setVolumes([]); setOverallOutline(""); setSaved(false);
    try {
      const res = await fetch("/api/ai/outline-volumes", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ genre, idea, wordCount }),
      });
      if (await handleRateLimited(res)) return;
      const data = await res.json();
      if (data.error) { alert(data.error); return; }
      setVolumes(data.volumes || []);
      setOverallOutline(data.overallOutline || "");
      setGrowthLine(data.growthLine || "");
      setTimeout(() => topRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (err: any) { alert("生成失败：" + (err.message || "未知错误")); }
    finally { setGenVolLoading(false); }
  };

  const getFullOutlineText = () => {
    let text = "";
    if (overallOutline) text += `【总体大纲】\n${overallOutline}\n\n`;
    for (const vol of volumes) {
      text += `第${vol.index}卷：${vol.name}\n`;
      if (vol.summary) text += `${vol.summary}\n`;
      if (vol.chapterRange) text += `章节范围：${vol.chapterRange}\n`;
      text += `\n【第${vol.index}卷完】\n\n`;
    }
    if (growthLine) text += growthLine + "\n";
    return text;
  };

  const handleSaveProject = async () => {
    if (!title.trim()) return;
    if (!userEmail) { router.push("/login"); return; }
    setSaving(true);
    try {
      await authFetch("/api/projects", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), genre, summary: idea.slice(0, 200), outline: getFullOutlineText() }),
      });
      setSaved(true);
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const handleAnalyze = async () => {
    if (!bookName.trim()) return;
    setAnalyzeLoading(true); setAnalysis("");
    try {
      const res = await fetch("/api/ai/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bookName, text: bookText }) });
      if (await handleRateLimited(res)) return;
      await readStream(res, (chunk) => setAnalysis(prev => prev + chunk));
    } catch (err: any) { alert("拆书失败：" + (err.message || "未知错误")); }
    finally { setAnalyzeLoading(false); }
  };

  const isLoggedIn = !!userEmail;

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100">
      <nav className="border-b border-gray-800 px-4 sm:px-6 py-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">执笔惊鸿</h1>
          <span className="text-xs text-gray-500 hidden sm:inline">一笔落墨，自成爆款</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto whitespace-nowrap max-w-[60vw] sm:max-w-none">
          {isLoggedIn ? (
            <>
              <span className="text-xs text-gray-500 hidden sm:inline">{userEmail}</span>
              <Link href="/recharge"
                className={`text-xs transition border rounded px-2 py-0.5 shrink-0 ${balance !== null && balance > 0 ? "text-gray-500 hover:text-purple-400 border-gray-700" : "text-purple-400 border-purple-600 hover:bg-purple-600/10"}`}>
                {balance !== null ? `余额 ${(balance / 10000).toFixed(1)}万` : "去充值"}
              </Link>
              <Link href="/platforms" className="text-xs text-gray-500 hover:text-white transition shrink-0">平台</Link>
              <Link href="/help" className="text-xs text-gray-500 hover:text-white transition shrink-0">手册</Link>
              <Link href="/invite" className="text-xs text-amber-400 hover:text-amber-300 transition shrink-0">邀请</Link>
              <Link href="/dashboard" className="text-sm text-gray-400 hover:text-white transition shrink-0">我的作品</Link>
              <button onClick={async () => { await doSignOut(); setUserEmail(""); }} className="text-sm text-gray-400 hover:text-white transition shrink-0">退出</button>
            </>
          ) : (
            <>
              <Link href="/platforms" className="text-xs text-gray-500 hover:text-white transition shrink-0">平台</Link>
              <Link href="/help" className="text-xs text-gray-500 hover:text-white transition shrink-0">手册</Link>
              <Link href="/login" className="text-sm text-gray-400 hover:text-white transition shrink-0">登录</Link>
            </>
          )}
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12 text-center" ref={topRef}>
        <h2 className="text-4xl font-bold mb-4">输入一个想法，<span className="text-purple-400">AI帮你写完整部小说</span></h2>
        <p className="text-gray-400 mb-6 text-lg">总纲 → 分卷大纲，保存后进入编辑器中逐步生成细纲</p>

        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3 mb-10 max-w-3xl mx-auto px-2 sm:px-0">
          {[
            { icon: "📋", label: "AI 大纲", desc: "总纲+五卷结构" },
            { icon: "✍️", label: "AI 续写", desc: "上下文+角色感知" },
            { icon: "✨", label: "去 AI 味", desc: "润色自然口语化" },
            { icon: "🔍", label: "智能拆书", desc: "拆解爆款结构" },
            { icon: "💰", label: "9.9 元起", desc: "100 万字额度" },
          ].map((f, i) => (
            <div key={i} className="bg-gray-900/60 border border-gray-800 rounded-xl p-3 text-center hover:border-purple-700 transition">
              <p className="text-xl mb-1">{f.icon}</p>
              <p className="text-xs font-bold text-gray-200">{f.label}</p>
              <p className="text-[10px] text-gray-500">{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="flex justify-center gap-2 mb-8">
          <button onClick={() => setTab("create")}
            className={`px-6 py-2 rounded-lg text-sm font-medium transition ${tab === "create" ? "bg-purple-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"}`}>
            📝 AI生成大纲
          </button>
          <button onClick={() => setTab("analyze")}
            className={`px-6 py-2 rounded-lg text-sm font-medium transition ${tab === "analyze" ? "bg-pink-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"}`}>
            🔍 智能拆书
          </button>
        </div>

        {needLogin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-8 w-96 text-center">
              <p className="text-4xl mb-4">🔐</p>
              <p className="text-lg font-bold mb-2">今日免费次数已用完</p>
              <p className="text-sm text-gray-400 mb-6">注册登录后可无限使用所有AI功能</p>
              <Link href="/login" className="block w-full py-2.5 rounded-lg font-medium bg-purple-600 hover:bg-purple-700 transition text-sm mb-2">去登录 / 注册</Link>
              <button onClick={() => setNeedLogin(false)} className="text-xs text-gray-500 hover:text-white transition">稍后再说</button>
            </div>
          </div>
        )}

        {/* ==================== Tab 1: 大纲生成 ==================== */}
        {tab === "create" && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
            {/* 作品名 */}
            <div className="flex gap-2">
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="作品名称（自己写，或点AI起名）"
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-purple-500 placeholder-gray-600" />
              <button onClick={async () => {
                setGenVolLoading(true); setTitleOptions([]);
                try {
                  const r = await fetch("/api/ai/titles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idea, genre, outline: "" }) });
                  if (await handleRateLimited(r)) return;
                  const d = await r.json();
                  if (d.error) { alert("AI起名失败：" + d.error); return; }
                  setTitleOptions(d.titles || []);
                } catch (e: any) { alert("网络错误：" + e.message); }
                finally { setGenVolLoading(false); }
              }} disabled={genVolLoading}
                className="px-4 py-2 bg-pink-600 hover:bg-pink-700 disabled:opacity-50 rounded-lg text-xs transition whitespace-nowrap">
                {genVolLoading ? "生成中..." : "🤖 AI起名"}
              </button>
            </div>
            {titleOptions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {titleOptions.map((t, i) => (
                  <button key={i} onClick={() => { setTitle(t); setTitleOptions([]); }}
                    className="px-3 py-1.5 bg-pink-900/30 border border-pink-800 rounded-lg text-xs text-pink-300 hover:bg-pink-900/50 transition">{t}</button>
                ))}
              </div>
            )}
            <div className="flex gap-4">
              <select value={genre} onChange={e => setGenre(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm">
                <option>都市</option><option>玄幻</option><option>言情</option><option>悬疑</option><option>科幻</option><option>历史</option><option>年代</option><option>穿越</option><option>爽文</option>
              </select>
              <select value={wordCount} onChange={e => setWordCount(Number(e.target.value))} className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm">
                <option value={50}>50万字</option><option value={80}>80万字</option><option value={100}>100万字</option><option value={150}>150万字</option>
              </select>
            </div>
            <textarea value={idea} onChange={e => setIdea(e.target.value)} placeholder="输入你的小说思路..." className="w-full h-32 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm resize-none focus:outline-none focus:border-purple-500 placeholder-gray-600" />

            {/* 第一步按钮 */}
            {volumes.length === 0 && (
              <button onClick={handleGenerateVolumes} disabled={genVolLoading || !idea.trim()}
                className="w-full py-3 rounded-lg font-medium bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition">
                {genVolLoading ? "AI正在生成总体大纲..." : "📋 生成总体大纲"}
              </button>
            )}

            {/* 展示总体大纲 + 五卷 */}
            {volumes.length > 0 && (
              <div className="text-left space-y-3 mt-2">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-lg font-bold text-purple-400">📋 完整大纲</h3>
                  <div className="flex gap-3 items-center">
                    <button onClick={() => { setVolumes([]); setOverallOutline(""); setSaved(false); }}
                      className="text-xs text-gray-500 hover:text-white transition">重新生成</button>
                    <button onClick={handleSaveProject} disabled={saving || !title.trim()}
                      className="text-xs text-green-400 hover:text-green-300 disabled:opacity-50 transition">
                      {saved ? "✅ 已保存" : saving ? "保存中..." : "💾 保存作品"}
                    </button>
                  </div>
                </div>

                {/* 总体大纲 */}
                {overallOutline && (
                  <div className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-purple-800/40 rounded-xl p-5">
                    <h4 className="text-sm font-bold text-purple-300 mb-2">📖 总体大纲</h4>
                    <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{overallOutline}</pre>
                  </div>
                )}

                {/* 五卷卡片 */}
                <div className="grid gap-2">
                  {volumes.map((vol) => (
                    <div key={vol.index} className="bg-gray-800/40 border border-gray-700 rounded-xl p-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-bold text-white shrink-0">第{vol.index}卷：{vol.name}</span>
                        <span className="text-xs text-gray-400 truncate">{vol.summary}</span>
                        {vol.chapterRange && <span className="text-xs text-gray-600 shrink-0">({vol.chapterRange})</span>}
                      </div>
                    </div>
                  ))}
                </div>

                {growthLine && (
                  <div className="bg-gray-800/30 border border-purple-900/50 rounded-xl p-4 mt-2">
                    <span className="text-sm text-gray-400">{growthLine}</span>
                  </div>
                )}

                {volumes.length > 0 && (
                  <button onClick={handleSaveProject} disabled={saving || !title.trim()}
                    className="w-full py-3 rounded-lg font-medium bg-green-600 hover:bg-green-700 disabled:opacity-50 transition mt-2">
                    {saved ? "✅ 已保存到我的作品" : saving ? "保存中..." : "💾 保存完整大纲到我的作品"}
                  </button>
                )}
                {saved && (
                  <div className="text-center">
                    <Link href="/dashboard" className="text-purple-400 hover:text-purple-300 text-sm">去我的作品查看 →</Link>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ==================== Tab 2: 拆书 ==================== */}
        {tab === "analyze" && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
            <p className="text-sm text-gray-400 text-left">输入书名，AI自动拆解。热门网文可直接分析，冷门书可粘贴原文补充。</p>
            <div className="flex gap-3">
              <input value={bookName} onChange={e => setBookName(e.target.value)} placeholder="输入书名，如：情满四合院"
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-pink-500 placeholder-gray-600" />
              <select value={bookGenre} onChange={e => setBookGenre(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm">
                <option>都市</option><option>玄幻</option><option>言情</option><option>悬疑</option><option>科幻</option><option>历史</option><option>年代</option><option>穿越</option><option>爽文</option>
              </select>
            </div>
            <details className="text-left">
              <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400">高级：粘贴原文片段（冷门书用，可选）</summary>
              <textarea value={bookText} onChange={e => setBookText(e.target.value)} placeholder="粘贴小说前几章内容..."
                className="w-full h-32 mt-2 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm resize-none focus:outline-none focus:border-pink-500 placeholder-gray-600" />
            </details>
            <button onClick={handleAnalyze} disabled={analyzeLoading || !bookName.trim()}
              className="w-full py-3 rounded-lg font-medium bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition">
              {analyzeLoading ? "AI正在拆解分析..." : "🔍 拆解这本书的结构"}
            </button>
            {analysis && (
              <div className="mt-6 bg-gray-900 border border-gray-800 rounded-xl p-6 text-left">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-pink-400">📊 拆书分析报告</h3>
                  <div className="flex gap-2">
                    <button onClick={() => navigator.clipboard.writeText(analysis)} className="text-sm text-gray-400 hover:text-white">复制</button>
                    <button onClick={() => { setGenre(bookGenre); setIdea(`参考《${bookName}》的结构风格，写一本新书。\n\n拆书分析：\n${analysis.slice(0, 2000)}`); setTab("create"); setVolumes([]); setOverallOutline(""); scrollTo(0, 0); }}
                      className="text-sm px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded-lg transition">📝 用这个结构生成大纲</button>
                  </div>
                </div>
                <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{analysis}</pre>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
