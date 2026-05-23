"use client";

import { useEffect, useState } from "react";
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

export default function Home() {
  const router = useRouter();
  const [tab, setTab] = useState<"create" | "analyze">("create");
  const [userEmail, setUserEmail] = useState("");
  // 创作模式
  const [genre, setGenre] = useState("都市");
  const [idea, setIdea] = useState("");
  const [title, setTitle] = useState("");
  const [wordCount, setWordCount] = useState(80);
  const [outline, setOutline] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [titleOptions, setTitleOptions] = useState<string[]>([]);
  const [needLogin, setNeedLogin] = useState(false);
  // 登录状态
  useEffect(() => {
    const t = getToken();
    if (!t) return;
    authFetch("/api/auth/me").then(r => r.json()).then(d => {
      if (d.email) setUserEmail(d.email);
    }).catch(() => {});
  }, []);
  // 拆书模式
  const [bookName, setBookName] = useState("");
  const [bookText, setBookText] = useState("");
  const [bookGenre, setBookGenre] = useState("都市");
  const [analysis, setAnalysis] = useState("");

  const handleRateLimited = async (res: Response) => {
    if (res.status === 429) {
      const data = await res.json().catch(() => ({}));
      if (data.needLogin) {
        setLoading(false);
        setNeedLogin(true);
        return true;
      }
    }
    return false;
  };

  // AI生成大纲（流式渲染）
  const handleGenerateOutline = async () => {
    if (!idea.trim()) return;
    setLoading(true); setOutline(""); setSaved(false);
    try {
      const res = await fetch("/api/ai/outline", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ genre, idea, wordCount }) });
      if (await handleRateLimited(res)) return;
      await readStream(res, (chunk) => setOutline(prev => prev + chunk));
    } catch (err: any) { console.error(err); alert("生成失败：" + (err.message || "未知错误")); }
    finally { setLoading(false); }
  };

  // 智能拆书（流式渲染）
  const handleAnalyze = async () => {
    if (!bookName.trim()) return;
    setLoading(true); setAnalysis("");
    try {
      const res = await fetch("/api/ai/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bookName, text: bookText }) });
      if (await handleRateLimited(res)) return;
      await readStream(res, (chunk) => setAnalysis(prev => prev + chunk));
    } catch (err: any) { console.error(err); alert("拆书失败：" + (err.message || "未知错误")); }
    finally { setLoading(false); }
  };

  // 保存为作品
  const handleSaveProject = async () => {
    if (!outline || !title.trim()) return;
    if (!userEmail) { router.push("/login"); return; }
    setSaving(true);
    try {
      await authFetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: title.trim(), genre, summary: idea.slice(0, 200), outline }) });
      setSaved(true);
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">执笔惊鸿</h1>
          <span className="text-xs text-gray-500 hidden sm:inline">一笔落墨，自成爆款</span>
        </div>
        <div className="flex items-center gap-4">
          {userEmail ? (
            <>
              <span className="text-xs text-gray-500">{userEmail}</span>
              <Link href="/dashboard" className="text-sm text-gray-400 hover:text-white transition">我的作品</Link>
              <button onClick={async () => { await doSignOut(); setUserEmail(""); router.push("/"); }} className="text-sm text-gray-400 hover:text-white transition">退出</button>
            </>
          ) : (
            <Link href="/login" className="text-sm text-gray-400 hover:text-white transition">登录</Link>
          )}
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12 text-center">
        <h2 className="text-4xl font-bold mb-4">输入一个想法，<span className="text-purple-400">AI帮你写完整部小说</span></h2>
        <p className="text-gray-400 mb-8 text-lg">从大纲到章节，智能拆书分析，一站式AI写作工作台</p>

        {/* Tab切换 */}
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

        {/* 登录提示弹窗 */}
        {needLogin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-8 w-96 text-center">
              <p className="text-4xl mb-4">🔐</p>
              <p className="text-lg font-bold mb-2">今日免费次数已用完</p>
              <p className="text-sm text-gray-400 mb-6">注册登录后可无限使用所有AI功能</p>
              <Link href="/login"
                className="block w-full py-2.5 rounded-lg font-medium bg-purple-600 hover:bg-purple-700 transition text-sm mb-2">
                去登录 / 注册
              </Link>
              <button onClick={() => setNeedLogin(false)}
                className="text-xs text-gray-500 hover:text-white transition">
                稍后再说
              </button>
            </div>
          </div>
        )}

        {/* Tab 1: AI生成大纲 */}
        {tab === "create" && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
            <div className="flex gap-2">
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="作品名称（自己写，或点AI起名）"
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-purple-500 placeholder-gray-600" />
              <button onClick={async () => {
                if (loading) return;
                setLoading(true); setTitleOptions([]);
                try {
                  const r = await fetch("/api/ai/titles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idea, genre, outline }) });
                  if (await handleRateLimited(r)) return;
                  const d = await r.json();
                  if (d.error) { alert("AI起名失败：" + d.error); return; }
                  setTitleOptions(d.titles || []);
                } catch (e: any) { alert("网络错误：" + e.message); }
                finally { setLoading(false); }
              }} disabled={loading}
                className="px-4 py-2 bg-pink-600 hover:bg-pink-700 disabled:opacity-50 rounded-lg text-xs transition whitespace-nowrap">
                {loading ? "生成中..." : "🤖 AI起名"}
              </button>
            </div>
            {titleOptions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {titleOptions.map((t: string, i: number) => (
                  <button key={i} onClick={() => { setTitle(t); setTitleOptions([]); }}
                    className="px-3 py-1.5 bg-pink-900/30 border border-pink-800 rounded-lg text-xs text-pink-300 hover:bg-pink-900/50 transition">
                    {t}
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-4">
              <select value={genre} onChange={(e) => setGenre(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm">
                <option>都市</option><option>玄幻</option><option>言情</option><option>悬疑</option><option>科幻</option><option>历史</option><option>年代</option><option>穿越</option><option>爽文</option>
              </select>
              <select value={wordCount} onChange={(e) => setWordCount(Number(e.target.value))} className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm">
                <option value={50}>50万字</option><option value={80}>80万字</option><option value={100}>100万字</option><option value={150}>150万字</option>
              </select>
            </div>
            <textarea value={idea} onChange={(e) => setIdea(e.target.value)} placeholder="输入你的小说思路..." className="w-full h-32 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm resize-none focus:outline-none focus:border-purple-500 placeholder-gray-600" />
            <button onClick={handleGenerateOutline} disabled={loading || !idea.trim()}
              className="w-full py-3 rounded-lg font-medium bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition">
              {loading ? "AI正在生成大纲..." : "一键生成完整大纲"}
            </button>
            {outline && (
              <div className="mt-6 bg-gray-900 border border-gray-800 rounded-xl p-6 text-left">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-purple-400">生成的大纲</h3>
                  <div className="flex gap-3">
                    <button onClick={() => navigator.clipboard.writeText(outline)} className="text-sm text-gray-400 hover:text-white">复制</button>
                    <button onClick={handleSaveProject} disabled={saving || !title.trim()} className="text-sm text-green-400 hover:text-green-300 disabled:opacity-50">
                      {saved ? "✅ 已保存" : saving ? "保存中..." : "保存到我的作品"}
                    </button>
                  </div>
                </div>
                <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{outline}</pre>
                {saved && <div className="mt-4 pt-4 border-t border-gray-800"><Link href="/dashboard" className="text-purple-400 hover:text-purple-300 text-sm">去我的作品查看 →</Link></div>}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: 智能拆书 */}
        {tab === "analyze" && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
            <p className="text-sm text-gray-400 text-left">输入书名，AI自动拆解。热门网文（如《诡秘之主》《斗破苍穹》《情满四合院》）可直接分析。冷门书可粘贴原文补充。</p>
            <div className="flex gap-3">
              <input value={bookName} onChange={(e) => setBookName(e.target.value)}
                placeholder="输入书名，如：情满四合院"
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-pink-500 placeholder-gray-600" />
              <select value={bookGenre} onChange={(e) => setBookGenre(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm">
                <option>都市</option><option>玄幻</option><option>言情</option><option>悬疑</option><option>科幻</option><option>历史</option><option>年代</option><option>穿越</option><option>爽文</option>
              </select>
            </div>

            <details className="text-left">
              <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400">高级：粘贴原文片段（冷门书用，可选）</summary>
              <textarea value={bookText} onChange={(e) => setBookText(e.target.value)}
                placeholder="粘贴小说前几章内容..."
                className="w-full h-32 mt-2 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm resize-none focus:outline-none focus:border-pink-500 placeholder-gray-600" />
            </details>

            <button onClick={handleAnalyze} disabled={loading || !bookName.trim()}
              className="w-full py-3 rounded-lg font-medium bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition">
              {loading ? "AI正在拆解分析..." : "🔍 拆解这本书的结构"}
            </button>
            {analysis && (
              <div className="mt-6 bg-gray-900 border border-gray-800 rounded-xl p-6 text-left">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-pink-400">📊 拆书分析报告</h3>
                  <div className="flex gap-2">
                    <button onClick={() => navigator.clipboard.writeText(analysis)} className="text-sm text-gray-400 hover:text-white">复制</button>
                    <button onClick={async () => {
                      setGenre(bookGenre);
                      setIdea(`参考《${bookName}》的结构风格，写一本新书。\n\n拆书分析：\n${analysis.slice(0, 2000)}`);
                      setTab("create");
                      setTimeout(async () => {
                        setLoading(true); setOutline(""); setSaved(false);
                        try {
                          const res = await fetch("/api/ai/outline", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ genre: bookGenre, idea: `参考《${bookName}》的结构风格，写一本新书。\n\n拆书分析：\n${analysis.slice(0, 2000)}`, wordCount: 80 }) });
                          if (await handleRateLimited(res)) return;
                          await readStream(res, (chunk) => setOutline(prev => prev + chunk));
                        } catch (err) { console.error(err); }
                        finally { setLoading(false); }
                      }, 300);
                    }}
                      className="text-sm px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded-lg transition">
                      📝 用这个结构生成大纲
                    </button>
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
