"use client";

import { useState } from "react";

interface VolInfo {
  id: string; title: string; sort_order: number; chapterCount: number;
}

async function readStream(res: Response, onChunk: (text: string) => void) {
  const reader = res.body?.getReader();
  if (!reader) { onChunk(await res.text()); return; }
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    onChunk(decoder.decode(value, { stream: true }));
  }
}

export function SidebarClient({
  projectId, projectTitle, genre, idea,
  volumes: initialVolumes, allChapters, allProjects, currentProjectId,
  chapterRanges = {},
}: {
  projectId: string; projectTitle: string; genre: string; idea: string;
  volumes: VolInfo[]; allChapters: any[]; allProjects: any[]; currentProjectId: string;
  chapterRanges?: Record<string, string>;
}) {
  const [expandedVol, setExpandedVol] = useState<number | null>(1);
  const [volCards, setVolCards] = useState<Record<string, string>>({});
  const [genLoading, setGenLoading] = useState<number | null>(null);
  const [savingVol, setSavingVol] = useState<string | null>(null);

  const volList = [...initialVolumes].sort((a, b) => a.sort_order - b.sort_order);

  const generateCards = async (volIdx: number, vol: VolInfo) => {
    setGenLoading(volIdx);
    const key = String(volIdx);
    setVolCards(p => ({ ...p, [key]: "" }));
    try {
      const res = await fetch("/api/ai/outline-phase-detail", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          genre, idea, wordCount: 100,
          volumeIndex: volIdx, volumeName: vol.title,
          chapterRange: chapterRanges[vol.id] || "",
          projectId,
        }),
      });
      if (!res.ok) return;
      await readStream(res, (chunk) => {
        setVolCards(p => ({ ...p, [key]: (p[key] || "") + chunk }));
      });
    } catch {} finally { setGenLoading(null); }
  };

  const saveCardsAsChapters = async (volId: string, cardText: string) => {
    const titles: string[] = [];
    const regex = /## 第(\d+)章[：: ]\s*([^\n]+)/g;
    let m;
    while ((m = regex.exec(cardText)) !== null) {
      titles.push(`第${m[1]}章：${m[2].trim()}`);
    }
    if (!titles.length) { alert("未解析到章节标题"); return; }
    const idx = volList.findIndex(v => v.id === volId);
    if (idx === -1) return;
    const key = String(idx + 1);
    setSavingVol(key);
    try {
      for (const title of titles) {
        const res = await fetch(`/api/projects/${projectId}/chapters`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ volume_id: volId, title }),
        });
        if (!res.ok) { console.error("创建章节失败:", title); }
      }
      window.location.reload();
    } catch {} finally { setSavingVol(null); }
  };

  const regenVolCards = async (volIdx: number, vol: VolInfo) => {
    if (!confirm("重新生成会替换当前章卡，确定吗？")) return;
    await generateCards(volIdx, vol);
  };

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <a href="/dashboard" className="text-xs text-gray-500 hover:text-white">← 返回</a>
        <div className="relative group">
          <button className="text-xs text-gray-500 hover:text-white px-2 py-0.5 rounded hover:bg-gray-800 transition">
            📂 切换
          </button>
          <div className="absolute right-0 top-full mt-1 w-48 bg-gray-900 border border-gray-700 rounded-xl p-1.5 shadow-xl hidden group-hover:block z-50 max-h-48 overflow-y-auto">
            {(allProjects || []).map((p: any) => (
              <a key={p.id} href={`/project/${p.id}`}
                className={`block text-xs px-3 py-1.5 rounded-lg transition ${p.id === currentProjectId ? "bg-purple-600 text-white" : "text-gray-400 hover:bg-gray-800 hover:text-white"}`}>
                {p.title.slice(0, 24)}
              </a>
            ))}
          </div>
        </div>
      </div>
      <h2 className="text-base font-bold mb-1">{projectTitle}</h2>
      <p className="text-xs text-gray-500 mb-3">{genre} · {volList.length}卷 · {allChapters.length}章</p>

      {volList.map((vol, idx) => {
        const volIdx = idx + 1;
        const chapters = allChapters.filter((c: any) => c.volume_id === vol.id).sort((a: any, b: any) => a.sort_order - b.sort_order);
        const isExpanded = expandedVol === volIdx;
        const key = String(volIdx);
        const cards = volCards[key];
        const isGenerating = genLoading === volIdx;
        const isSaving = savingVol === key;
        const chapterCount = cards ? (cards.match(/## 第/g) || []).length : 0;

        return (
          <div key={vol.id} className="mb-2">
            <button
              onClick={() => setExpandedVol(isExpanded ? null : volIdx)}
              className="w-full text-left flex items-center justify-between gap-1 px-1 py-1 rounded hover:bg-gray-800/50 transition"
            >
              <h3 className="text-xs font-bold text-purple-400 truncate">{vol.title} ({chapters.length})</h3>
              <span className={`text-[10px] text-gray-600 transition-transform ${isExpanded ? "rotate-180" : ""}`}>▼</span>
            </button>

            {/* 已保存的章节列表 */}
            {chapters.map((ch: any) => (
              <a key={ch.id} href={`/project/${projectId}?cid=${ch.id}`}
                className="block text-left text-xs px-2 py-1 rounded mb-0.5 text-gray-400 hover:bg-gray-800 hover:text-white transition">
                {ch.sort_order}. {ch.title.split('\n')[0].slice(0, 26)}{ch.content ? " ✓" : ""}
              </a>
            ))}

            {/* 展开：生成章卡 / 查看章卡 */}
            {isExpanded && (
              <div className="ml-1 pl-2 border-l border-gray-700 mt-1 space-y-1">
                {!cards && !isGenerating && (
                  <button onClick={() => generateCards(volIdx, vol)}
                    className="text-[11px] px-2 py-1 bg-purple-600/30 hover:bg-purple-600/50 rounded w-full text-left transition">
                    📋 生成章卡
                  </button>
                )}
                {isGenerating && (
                  <p className="text-[11px] text-amber-400 px-1">
                    {chapterCount > 0 ? `生成中... ${chapterCount}章` : "生成中..."}
                  </p>
                )}
                {cards && !isGenerating && (
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-green-400">{chapterCount}章已生成</span>
                      <button onClick={() => regenVolCards(volIdx, vol)}
                        className="text-[10px] text-gray-500 hover:text-white transition">
                        重新生成
                      </button>
                    </div>
                    <pre className="mt-0.5 text-[10px] text-gray-500 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">{cards}</pre>
                    <button onClick={() => saveCardsAsChapters(vol.id, cards)}
                      disabled={isSaving}
                      className="mt-1 w-full text-[10px] px-2 py-1 bg-green-700/50 hover:bg-green-700/80 disabled:opacity-40 rounded transition">
                      {isSaving ? "保存中..." : "📌 保存为章节"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
