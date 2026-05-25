"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { authFetch } from "@/lib/auth";
import { detectHooks } from "@/lib/hooks";
import { exportSingleChapter, exportFullProject, type ExportFormat } from "@/lib/export";
import type { Project, Chapter, Character } from "@/types";

export function ChapterEditor({ projectId, project, chapters, characters, dbVolumes }: { projectId: string; project: Project; chapters: Chapter[]; characters: Character[]; dbVolumes: any[] }) {
  const searchParams = useSearchParams();
  const cid = searchParams.get("cid");

  const [activeChapter, setActiveChapter] = useState<any>(null);
  const [charList, setCharList] = useState<any[]>(characters);
  const [showCharForm, setShowCharForm] = useState(false);
  const [charName, setCharName] = useState("");
  const [charDesc, setCharDesc] = useState("");
  const [content, setContent] = useState("");
  const [aiResult, setAiResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"" | "comply" | "versions" | "outline" | "hooks">("");
  const [targetWords, setTargetWords] = useState(2500);
  const [versions, setVersions] = useState<any[]>([]);
  const [chapterName, setChapterName] = useState("");
  const [outlineText, setOutlineText] = useState("");
  const [bulkMsg, setBulkMsg] = useState("");
  const [showBatch, setShowBatch] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"" | "saving" | "saved" | "error">("");
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<string>("");
  const [exportFmt, setExportFmt] = useState<ExportFormat>("txt");
  const [balance, setBalance] = useState<number | null>(null);
  const [styleSample, setStyleSample] = useState("");
  const [showStyleSample, setShowStyleSample] = useState(false);
  const [styleSaving, setStyleSaving] = useState(false);
  const [summaryStatus, setSummaryStatus] = useState<"" | "generating" | "done">("");

  // 字数统计（中文去空白）

  useEffect(() => {
    fetch("/api/payment/balance")
      .then(r => r.json()).then(d => setBalance(d.remaining_words ?? null)).catch(() => {});
    fetch(`/api/projects/${projectId}/style-sample`)
      .then(r => r.json()).then(d => setStyleSample(d.style_sample || "")).catch(() => {});
  }, [projectId]);

  useEffect(() => {
    if (cid) {
      const ch = chapters.find((c: any) => c.id === cid);
      if (ch) { setActiveChapter(ch); setContent(ch.content || ""); setAiResult(""); setTab(""); setSaveStatus(""); setSummaryStatus(""); }
    }
  }, [cid, chapters]);

  // Shared save: persists chapter content to the server
  const save = useCallback(async (text: string) => {
    if (!activeChapter) return;
    setSaveStatus("saving");
    try {
      const r = await authFetch(`/api/projects/${projectId}/chapters/${activeChapter.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: text }),
      });
      if (r.ok) { lastSavedRef.current = text; setSaveStatus("saved"); setTimeout(() => setSaveStatus(""), 2000); }
      else setSaveStatus("error");
    } catch { setSaveStatus("error"); }
  }, [activeChapter, projectId]);

  // Debounced auto-save: triggers 2s after user stops typing
  useEffect(() => {
    if (!activeChapter || content === undefined) return;
    if (content === lastSavedRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => save(content), 2000);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [content, activeChapter, save]);

  const aiAction = async (endpoint: string, body: any) => {
    setLoading(true); setAiResult("");
    const r = await authFetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!r.ok) {
      const err = await r.json().catch(() => ({ error: `请求失败 (${r.status})` }));
      setAiResult(""); setLoading(false);
      alert(err.error || "请求失败");
      return;
    }
    const text = endpoint.includes("polish") ? (await r.json()).result : await r.text();
    setAiResult(text); setLoading(false);
  };

  // 字数统计（中文去空白）
  const wordCount = content ? content.replace(/\s/g, "").length : 0;
  const gap = targetWords - wordCount;
  const wordStatus = gap > 500 ? `还差${gap}字` : gap > 0 ? `差${gap}字` : gap > -500 ? "达标" : "超标";
  const wordColor = gap > 500 ? "text-yellow-400" : gap > 0 ? "text-green-400" : gap > -500 ? "text-green-400" : "text-orange-400";

  // 对话占比（精确检测：只算引号内的对话文本行）
  let dialogueRatio = 0;
  if (content) {
    const lines = content.split("\n").filter((l: string) => l.trim());
    // Count lines that start with a quote (dialog) or contain paired quotes (多字对话)
    const dialogueLines = lines.filter((l: string) => {
      const trimmed = l.trim();
      // Direct quote start: "..." or '...' or 「...」
      if (/^[""'「』『]/.test(trimmed)) return true;
      // Contains paired quotes with at least 2 chars inside (e.g., "你好")
      const matches = trimmed.match(/[""](.+?)[""]/);
      if (matches && matches[1].length >= 2) return true;
      // Contains Chinese dialog marker ——  他说道："……"
      if (/[：:]["'「]/.test(trimmed)) return true;
      return false;
    });
    dialogueRatio = lines.length > 0 ? Math.round((dialogueLines.length / lines.length) * 100) : 0;
  }
  const dialogueStatus = dialogueRatio >= 60 ? "达标" : "偏低";
  const dialogueColor = dialogueRatio >= 60 ? "text-green-400" : "text-yellow-400";

  // 检查上一章是否有内容（顺序续写检查）
  const prevChapterEmpty = useMemo(() => {
    if (!activeChapter || !chapters.length) return false;
    const sorted = [...chapters].sort((a: any, b: any) => a.sort_order - b.sort_order);
    const idx = sorted.findIndex((c: any) => c.id === activeChapter.id);
    if (idx <= 0) return false;
    return !sorted[idx - 1]?.content?.trim();
  }, [activeChapter, chapters]);

  // 钩子检测
  const hookResult = useMemo(() => detectHooks(content), [content]);

  // 合规敏感词扫描（使用单词边界避免误报）
  const SENSITIVE: Record<string, string> = {
    "镇国将军": "封建→名门望族", "大明宗室": "封建→大明望族", "王爷": "封建→名门之后",
    "白手套": "政法→台前合作人", "顶罪": "政法→出面承担",
  };
  // 这些模式需要更精确的上下文匹配，用更严格的规则
  const SENSITIVE_LAX: [RegExp, string][] = [
    [/\b监狱\b/g, "政法→接受调查"],
    [/蹲了\s*\d+\s*年/g, "政法→接受调查"],
    [/白手套/g, "政法→台前合作人"],
    [/堵(了)?村口/g, "暴力→到访"],
    [/带人.*堵/g, "暴力→到访"],
    [/挖出.*祖传/g, "文物→祖传家藏"],
  ];
  const warnings: string[] = [];
  for (const [k, v] of Object.entries(SENSITIVE)) {
    const m = content.match(new RegExp(k, "g"));
    if (m) warnings.push(`⚠️ "${m[0]}" → ${v} (${m.length}次)`);
  }
  for (const [regex, v] of SENSITIVE_LAX) {
    const m = content.match(regex);
    if (m) warnings.push(`⚠️ "${m[0]}" → ${v} (${m.length}次)`);
  }

  if (!activeChapter) {
    return <div className="flex-1 h-screen flex items-center justify-center text-gray-600"><div className="text-center"><p className="text-4xl mb-4">📖</p><p className="text-lg">选择左侧章节开始写作</p></div></div>;
  }

  return (
    <div className="flex-1 h-screen overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-lg font-bold mb-1">{activeChapter.title.split('\n')[0]}</h2>
        <div className="text-xs text-gray-500 mb-2">
          {balance !== null ? (
            <>余额 <a href="/recharge" className="text-purple-400 hover:text-purple-300">{(balance / 10000).toFixed(1)}万</a></>
          ) : (
            <a href="/recharge" className="text-purple-400 hover:text-purple-300 font-medium">去充值</a>
          )}
          {(activeChapter as any)?.summary ? (
            <span className="group relative ml-2">
              <span className="text-xs text-gray-500 cursor-help border-b border-dotted border-gray-700">📝 剧情摘要</span>
              <span className="absolute left-0 top-full mt-1 w-80 p-2 bg-gray-800 border border-gray-700 rounded-lg text-xs text-gray-300 hidden group-hover:block z-50 shadow-xl whitespace-pre-wrap">
                {(activeChapter as any).summary}
              </span>
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-1.5 mb-4">
          <button onClick={() => {
            if (prevChapterEmpty) {
              if (!confirm("上一章还没有内容，建议先完成上一章再续写。确定要继续吗？")) return;
            }
            aiAction("/api/ai/continue", { projectId, chapterId: activeChapter.id, title: project.title, genre: project.genre, content, outline: activeChapter.title, targetWords });
          }}
            disabled={loading} className={`px-3 py-1.5 disabled:opacity-50 rounded-lg text-xs transition ${prevChapterEmpty ? "bg-orange-700 hover:bg-orange-600" : "bg-purple-600 hover:bg-purple-700"}`}>🤖 AI续写{prevChapterEmpty ? " ⚠️" : ""}</button>
          <select value={targetWords} onChange={(e) => setTargetWords(Number(e.target.value))}
            className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-gray-300">
            <option value={1500}>1500字</option><option value={2000}>2000字</option><option value={2500}>2500字</option><option value={3000}>3000字</option>
          </select>
          <button onClick={() => aiAction("/api/ai/polish", { text: content, projectId })}
            disabled={loading} className="px-3 py-1.5 bg-pink-600 hover:bg-pink-700 disabled:opacity-50 rounded-lg text-xs transition">✨ 去AI味</button>
          <button onClick={async () => {
            if (!content) return;
            const target = prompt("目标字数（当前" + wordCount + "字）：", String(Math.max(wordCount + 500, 2000)));
            if (!target || isNaN(Number(target))) return;
            setLoading(true);
            const r = await authFetch("/api/ai/expand", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: content, targetWords: Number(target), projectId }) });
            const d = await r.json();
            if (d.result) {
              const lines = activeChapter.title.split('\n');
              setContent(d.result);
              save(d.result);
            }
            if (d.error) alert(d.error);
            setLoading(false);
          }} disabled={loading || !content}
            className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 rounded-lg text-xs transition">📏 补字数</button>
          <span className={`px-3 py-1.5 bg-gray-800 rounded-lg text-xs ${wordColor}`}>📝 {wordCount}字 {wordStatus}</span>
          <span className={`px-3 py-1.5 bg-gray-800 rounded-lg text-xs ${dialogueColor}`}>💬 对话{dialogueRatio}% {dialogueStatus}</span>
          <button onClick={() => setShowCharForm(!showCharForm)}
            className={`px-3 py-1.5 rounded-lg text-xs transition ${showCharForm ? "bg-pink-600" : "bg-gray-800 hover:bg-gray-700"}`}>🎭 角色({charList.length})</button>
          <button onClick={() => setShowStyleSample(!showStyleSample)}
            className={`px-3 py-1.5 rounded-lg text-xs transition ${showStyleSample ? "bg-amber-600" : "bg-gray-800 hover:bg-gray-700"}`}>📝 文风</button>
          <button onClick={() => setTab(tab === "comply" ? "" : "comply")}
            className={`px-3 py-1.5 rounded-lg text-xs transition ${tab === "comply" ? "bg-red-600" : "bg-gray-800 hover:bg-gray-700"}`}>🛡️ 合规({warnings.length})</button>
          <button onClick={() => setTab(tab === "hooks" ? "" : "hooks")}
            className={`px-3 py-1.5 rounded-lg text-xs transition ${tab === "hooks" ? "bg-yellow-600" : "bg-gray-800 hover:bg-gray-700"}`}>🎣 钩子({hookResult.totalHooks})</button>
          <button onClick={async () => {
            await save(content);
            // 保存后自动生成摘要（仅当有内容且无摘要时）
            if (content?.trim() && wordCount > 200 && !summaryStatus) {
              setSummaryStatus("generating");
              try {
                const r = await fetch("/api/ai/summarize", {
                  method: "POST", headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ chapterId: activeChapter.id, content, projectId }),
                });
                const d = await r.json();
                if (d.summary) setSummaryStatus("done");
              } catch (e) { console.error("[摘要生成异常]", e); }
              setTimeout(() => setSummaryStatus(""), 3000);
            }
          }}
            className="px-3 py-1.5 bg-green-800 hover:bg-green-700 rounded-lg text-xs transition">💾 保存{summaryStatus === "generating" ? "📝" : summaryStatus === "done" ? "✅" : ""}</button>
          <button onClick={async () => {
            if (!content?.trim()) { alert("请先撰写章节内容"); return; }
            if (summaryStatus === "generating") return;
            setSummaryStatus("generating");
            try {
              const r = await fetch("/api/ai/summarize", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ chapterId: activeChapter.id, content, projectId }),
              });
              const d = await r.json();
              if (d.summary) setSummaryStatus("done");
              else alert("摘要生成失败：" + (d.error || "未知错误"));
            } catch (e: any) { alert("摘要生成失败：" + (e.message || "网络错误")); }
            setTimeout(() => setSummaryStatus(""), 3000);
          }}
            className="px-3 py-1.5 bg-indigo-700 hover:bg-indigo-600 rounded-lg text-xs transition">📝 摘要{summaryStatus === "generating" ? "..." : summaryStatus === "done" ? "✅" : ""}</button>
          <span className={`text-xs flex items-center ${saveStatus === "saving" ? "text-yellow-400" : saveStatus === "saved" ? "text-green-400" : saveStatus === "error" ? "text-red-400" : "hidden"}`}>
            {saveStatus === "saving" ? "保存中..." : saveStatus === "saved" ? "已保存" : saveStatus === "error" ? "保存失败" : ""}
          </span>
          <div className="flex gap-1 items-center">
            <button onClick={() => {
              if (content) exportSingleChapter(activeChapter.title.split('\n')[0], content, exportFmt);
            }} className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs transition">📥 导出</button>
            <select value={exportFmt} onChange={(e) => setExportFmt(e.target.value as ExportFormat)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-1 py-1.5 text-xs text-gray-300 w-12">
              <option value="txt">.txt</option><option value="markdown">.md</option>
            </select>
          </div>
          <button onClick={async () => {
            const all = chapters.filter((c: any) => c.content).sort((a: any, b: any) => a.sort_order - b.sort_order);
            if (!all.length) return;
            exportFullProject(project.title, all.map((c: any) => ({ title: c.title.split('\n')[0], content: c.content })), exportFmt);
            setBulkMsg(`已导出${all.length}章`);
            setTimeout(() => setBulkMsg(""), 2000);
          }} className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs transition">📦 全卷</button>
          <button onClick={() => {
            setShowBatch(!showBatch);
            if (!showBatch) setSelectedIds(new Set());
          }}
            className={`px-3 py-1.5 rounded-lg text-xs transition ${showBatch ? "bg-orange-600" : "bg-gray-800 hover:bg-gray-700"}`}>📋 批量</button>
          <button onClick={() => {
            if (tab === "outline") { setTab(""); return; }
            const lines = activeChapter.title.split('\n');
            setChapterName(lines[0]);
            setOutlineText(lines.slice(1).join('\n').trim());
            setTab("outline");
          }}
            className={`px-3 py-1.5 rounded-lg text-xs transition ${tab === "outline" ? "bg-blue-600" : "bg-gray-800 hover:bg-gray-700"}`}>📋 章纲</button>
          <button onClick={async () => {
            setTab("versions"); setLoading(true);
            const r = await authFetch(`/api/projects/${projectId}/chapters/${activeChapter.id}/versions`);
            const d = await r.json();
            setVersions(d || []);
            setLoading(false);
          }} className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs transition">📜 历史</button>
        </div>

        {showCharForm && (
          <div className="mb-3 p-3 bg-gray-900 border border-pink-800 rounded-lg text-xs">
            <div className="flex items-center justify-between mb-2">
              <p className="font-bold text-pink-400">🎭 角色管理（AI续写时自动参照）</p>
              <button onClick={() => setShowCharForm(false)} className="text-gray-600 hover:text-white text-xs">✕ 关闭</button>
            </div>
            <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
              {charList.length === 0 && <p className="text-gray-500">暂无角色，添加后AI续写会自动保持人物一致性</p>}
              {charList.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-1.5">
                  <div>
                    <span className="text-white font-bold">{c.name}</span>
                    <span className="text-gray-400 ml-2">{c.description?.slice(0, 40) || "暂无描述"}</span>
                  </div>
                  <button onClick={async () => {
                    if (!confirm(`确定删除角色"${c.name}"吗？`)) return;
                    await authFetch(`/api/projects/${projectId}/characters`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ charId: c.id }) });
                    setCharList(charList.filter((x: any) => x.id !== c.id));
                  }} className="text-gray-600 hover:text-red-400 text-xs">✕</button>
                </div>
              ))}
            </div>
            <button onClick={async () => {
              setLoading(true);
              const outline = chapters.map((c: any) => c.title).join("\n");
              const r = await authFetch("/api/ai/characters", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId, genre: project.genre, outline }) });
              const data = await r.json();
              if (data.characters) setCharList([...charList, ...data.characters]);
              setLoading(false);
            }} disabled={loading}
              className="w-full px-3 py-1.5 bg-pink-600 hover:bg-pink-700 disabled:opacity-50 rounded text-xs mb-2 transition">
              🤖 AI自动生成角色
            </button>
            <div className="flex gap-2">
              <input value={charName} onChange={(e) => setCharName(e.target.value)} placeholder="角色名" className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs" />
              <input value={charDesc} onChange={(e) => setCharDesc(e.target.value)} placeholder="外貌性格口头禅" className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs" />
              <button onClick={async () => {
                if (!charName.trim()) return;
                const r = await authFetch(`/api/projects/${projectId}/characters`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: charName, description: charDesc, traits: {} }) });
                const newChar = await r.json();
                setCharList([...charList, newChar]);
                setCharName(""); setCharDesc("");
              }} className="px-3 py-1 bg-pink-600 hover:bg-pink-700 rounded text-xs">添加</button>
            </div>
          </div>
        )}
        {showStyleSample && (
          <div className="mb-3 p-4 bg-gray-900 border border-amber-800 rounded-lg text-xs">
            <p className="font-bold text-amber-400 mb-1">📝 文风样本</p>
            <p className="text-gray-500 mb-2">粘贴一段你写的文字作为风格参考，AI续写/润色/扩写时会模仿这里的句式和节奏。</p>
            <textarea value={styleSample} onChange={(e) => setStyleSample(e.target.value)}
              placeholder={`粘贴你的章节文字作为文风样本...\n\n示例：\n李向阳推开院门，迎面正看见王婶在井边洗菜。他笑了笑，走过去打了声招呼。\n\nAI会模仿这段的句式长短、描写密度、对话习惯来生成后续内容。`}
              className="w-full h-40 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs resize-none focus:outline-none focus:border-amber-500 placeholder-gray-600 mb-3" />
            <div className="flex gap-2 items-center">
              <button onClick={async () => {
                if (!styleSample.trim()) return;
                setStyleSaving(true);
                try {
                  await fetch(`/api/projects/${projectId}/style-sample`, {
                    method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ style_sample: styleSample }),
                  });
                  alert("文风样本已保存");
                } catch { alert("保存失败"); }
                setStyleSaving(false);
              }} disabled={styleSaving || !styleSample.trim()}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 rounded transition">
                {styleSaving ? "保存中..." : "💾 保存"}
              </button>
              <button onClick={() => { setStyleSample(""); fetch(`/api/projects/${projectId}/style-sample`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ style_sample: "" }) }); }}
                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded transition">🗑️ 清除</button>
              <span className="text-gray-600">{styleSample.replace(/\s/g, "").length}字</span>
            </div>
          </div>
        )}
        {bulkMsg && <div className="mb-3 p-2 bg-green-900/30 border border-green-800 rounded-lg text-xs text-green-400 text-center">{bulkMsg}</div>}
        {showBatch && (
          <div className="mb-3 p-4 bg-gray-900 border border-orange-800 rounded-lg text-xs">
            <div className="flex items-center justify-between mb-3">
              <p className="font-bold text-orange-400">📋 批量操作 <span className="text-gray-500 font-normal">（{selectedIds.size}章已选）</span></p>
              <div className="flex gap-2">
                <button onClick={() => setSelectedIds(new Set(chapters.map((c: any) => c.id)))}
                  className="text-gray-400 hover:text-white">全选</button>
                <button onClick={() => setSelectedIds(new Set())}
                  className="text-gray-400 hover:text-white">取消</button>
                <button onClick={() => setShowBatch(false)}
                  className="text-gray-600 hover:text-white">✕</button>
              </div>
            </div>
            <div className="max-h-32 overflow-y-auto mb-3 space-y-1">
              {chapters.sort((a: any, b: any) => a.sort_order - b.sort_order).map((ch: any) => (
                <label key={ch.id} className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer transition ${selectedIds.has(ch.id) ? "bg-orange-900/30" : "hover:bg-gray-800"}`}>
                  <input type="checkbox" checked={selectedIds.has(ch.id)} onChange={() => {
                    const next = new Set(selectedIds);
                    if (next.has(ch.id)) next.delete(ch.id); else next.add(ch.id);
                    setSelectedIds(next);
                  }} className="accent-orange-500" />
                  <span className="text-gray-300">{ch.sort_order}. {ch.title.split('\n')[0].slice(0, 24)}</span>
                  <span className="text-gray-600 ml-auto">{ch.content ? `${ch.content.replace(/\s/g, "").length}字` : "空"}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={async () => {
                const ids = [...selectedIds];
                if (!ids.length) return;
                setBatchProcessing(true);
                let done = 0, fail = 0;
                setBulkMsg(`✨ 批量润色中... 0/${ids.length}`);
                for (const cid of ids) {
                  const ch = chapters.find((c: any) => c.id === cid);
                  if (!ch?.content) { done++; continue; }
                  try {
                    const r = await authFetch("/api/ai/polish", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: ch.content, projectId }) });
                    const d = await r.json();
                    if (d.result) {
                      await authFetch(`/api/projects/${projectId}/chapters/${cid}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: d.result }) });
                    }
                    done++;
                    setBulkMsg(`✨ 批量润色中... ${done}/${ids.length}`);
                  } catch { fail++; }
                }
                setBulkMsg(`✨ 批量润色完成：${done}章成功${fail ? `，${fail}章失败` : ""}`);
                setTimeout(() => setBulkMsg(""), 3000);
                setShowBatch(false); setBatchProcessing(false);
              }} disabled={batchProcessing || !selectedIds.size}
                className="px-3 py-1.5 bg-pink-600 hover:bg-pink-700 disabled:opacity-50 rounded transition">✨ 批量润色</button>
              <button onClick={async () => {
                const ids = [...selectedIds];
                if (!ids.length) return;
                if (!confirm(`确定删除选中的 ${ids.length} 章吗？此操作不可撤销。`)) return;
                setBatchProcessing(true);
                const r = await authFetch(`/api/projects/${projectId}/chapters/batch`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }) });
                const d = await r.json();
                setBulkMsg(d.success ? `🗑️ 已删除 ${d.count} 章` : `删除失败`);
                setShowBatch(false); setBatchProcessing(false);
                window.location.reload();
              }} disabled={batchProcessing || !selectedIds.size}
                className="px-3 py-1.5 bg-red-700 hover:bg-red-600 disabled:opacity-50 rounded transition">🗑️ 批量删除</button>
              <button onClick={() => {
                const ids = [...selectedIds];
                if (!ids.length) return;
                const selected = chapters.filter((c: any) => ids.includes(c.id)).sort((a: any, b: any) => a.sort_order - b.sort_order);
                const text = selected.map((c: any) => `# ${c.title.split('\n')[0]}\n\n${c.content || ""}`).join("\n\n---\n\n");
                const b = new Blob([text], { type: "text/plain;charset=utf-8" });
                const a = document.createElement("a"); a.href = URL.createObjectURL(b);
                a.download = `${project.title}_${selected.length}章.txt`; a.click();
                setBulkMsg(`📥 已导出${selected.length}章`);
                setShowBatch(false);
              }} disabled={!selectedIds.size}
                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded transition">📥 导出所选</button>
            </div>
          </div>
        )}
        {tab === "outline" && (
          <div className="mb-3 p-4 bg-gray-900 border border-blue-800 rounded-lg">
            <p className="font-bold text-blue-400 mb-3">📋 章纲编辑器</p>
            <label className="text-xs text-gray-400 mb-1 block">章节名称 <span className="text-gray-600">（显示在侧边栏）</span></label>
            <input value={chapterName} onChange={(e) => setChapterName(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm mb-3 focus:outline-none focus:border-blue-500" />
            <label className="text-xs text-gray-400 mb-1 block">章纲详情 <span className="text-gray-600">（核心事件、爽点、情感点、章末钩子）</span></label>
            <textarea value={outlineText} onChange={(e) => setOutlineText(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm mb-3 resize-none focus:outline-none focus:border-blue-500" rows={8}
              placeholder={`示例：
核心事件：主角在废墟中发现神秘遗迹，获得传承。
爽点：金手指觉醒、实力暴涨打脸反派。
情感点：与同伴重逢的感动、得知身世真相的震惊。
章末钩子：遗迹大门缓缓关闭，黑暗中传来低沉的呼吸声...`} />
            <div className="flex gap-2">
              <button onClick={async () => {
                const newTitle = chapterName + (outlineText ? '\n\n' + outlineText : '');
                await authFetch(`/api/projects/${projectId}/chapters/${activeChapter.id}`, {
                  method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: newTitle }),
                });
                setActiveChapter({ ...activeChapter, title: newTitle });
                setTab("");
              }} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-xs">✅ 保存章纲</button>
              <button onClick={() => setTab("")} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-xs">取消</button>
            </div>
          </div>
        )}
        {tab === "versions" && (
          <div className="mb-3 p-3 bg-gray-900 border border-blue-800 rounded-lg text-xs max-h-48 overflow-y-auto">
            <p className="font-bold text-blue-400 mb-1">📜 AI生成历史</p>
            {versions.length === 0 && <p className="text-gray-500">暂无历史版本。每次AI续写会自动保存。</p>}
            {versions.map((v: any, i: number) => (
              <div key={i} className="flex justify-between items-center bg-gray-800 rounded px-3 py-1.5 mb-1">
                <span className="text-gray-300">{new Date(v.created_at).toLocaleString("zh-CN")} · {v.model_used} · {(v.generated_content||"").length}字</span>
                <button onClick={async () => {
                  setContent((v.generated_content || ""));
                  await save(v.generated_content || "");
                  setTab("");
                }} className="text-blue-400 hover:text-blue-300 text-xs">恢复此版本</button>
              </div>
            ))}
          </div>
        )}
        {tab === "comply" && (
          <div className="mb-3 p-3 bg-gray-900 border rounded-lg text-xs space-y-0.5" style={{ borderColor: warnings.length > 0 ? "#7f1d1d" : "#166534" }}>
            <p className="font-bold mb-1" style={{ color: warnings.length > 0 ? "#f87171" : "#4ade80" }}>🛡️ 合规扫描 {warnings.length === 0 ? "✅ 通过" : ""}</p>
            {warnings.map((w, i) => <div key={i} className="text-red-400">{w}</div>)}
            <p className="text-gray-500 mt-1">基于飞卢禁章经验 + 番茄审核标准</p>
          </div>
        )}
        {tab === "hooks" && (
          <div className="mb-3 p-3 bg-gray-900 border border-yellow-800 rounded-lg text-xs">
            <p className="font-bold text-yellow-400 mb-1">🎣 章中钩子检测</p>
            <div className="flex gap-4 mb-2 text-gray-400">
              <span>钩子总数：<span className="text-white font-bold">{hookResult.totalHooks}</span></span>
              <span>密度评分：<span className={`font-bold ${hookResult.score >= 80 ? "text-green-400" : hookResult.score >= 50 ? "text-yellow-400" : "text-red-400"}`}>{hookResult.score}分</span></span>
              <span className="text-gray-600">（每500字1个钩子为合格）</span>
            </div>
            {hookResult.totalHooks === 0 && <p className="text-gray-500">未检测到明显钩子。建议在章尾加入悬念，对话中使用震惊/反问句式。</p>}
            <div className="max-h-40 overflow-y-auto space-y-0.5">
              {hookResult.hooks.map((h, i) => (
                <div key={i} className="flex items-center justify-between bg-gray-800 rounded px-2 py-1">
                  <span className="text-gray-400 w-16 shrink-0">第{h.line}行</span>
                  <span className="text-yellow-300 w-20 shrink-0">{h.type}</span>
                  <span className="text-gray-300 truncate flex-1 mx-2">"{h.text}"</span>
                  <span className="text-gray-500 w-24 shrink-0 text-right">{h.desc}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <textarea value={content} onChange={(e) => setContent(e.target.value)}
          className="w-full h-80 bg-gray-900 border border-gray-800 rounded-xl p-4 text-sm leading-relaxed resize-none focus:outline-none focus:border-purple-500" />

        {aiResult && (
          <div className="mt-4 bg-gray-900 border border-green-800 rounded-xl p-4">
            <div className="flex justify-between mb-2">
              <h3 className="text-sm font-bold text-green-400">AI结果</h3>
              <div className="flex gap-2">
                <button onClick={() => setAiResult("")} className="text-xs text-gray-500 hover:text-white">放弃</button>
                <button onClick={async () => {
                  setContent(p => p + "\n\n" + aiResult);
                  await authFetch(`/api/projects/${projectId}/chapters/${activeChapter.id}/versions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ generated_content: aiResult, prompt: activeChapter.title, model_used: "deepseek" }) });
                  setAiResult("");
                }} className="text-xs px-2 py-1 bg-green-600 hover:bg-green-700 rounded">✅ 采用</button>
              </div>
            </div>
            <pre className="text-xs text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{aiResult}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
