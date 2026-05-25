"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface UsageRecord {
  id: string;
  words_used: number;
  feature: string;
  project_id: string | null;
  chapter_id: string | null;
  created_at: string;
}

const FEATURE_LABELS: Record<string, string> = {
  continue: "AI续写",
  outline: "生成大纲",
  analyze: "拆书分析",
  expand: "补字数",
  polish: "去AI味",
  titles: "AI起名",
  characters: "生成角色",
};

export default function UsagePage() {
  const router = useRouter();
  const [records, setRecords] = useState<UsageRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;

  useEffect(() => {
    fetchUsage();
  }, [page]);

  async function fetchUsage() {
    setLoading(true);
    try {
      const offset = (page - 1) * PAGE_SIZE;
      const res = await fetch(`/api/payment/usage?limit=${PAGE_SIZE}&offset=${offset}`);
      if (res.status === 401) { router.push("/login"); return; }
      const data = await res.json();
      setRecords(data.records || []);
      setTotal(data.total || 0);
    } catch {} finally {
      setLoading(false);
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100">
      <nav className="border-b border-gray-800 px-4 sm:px-6 py-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/dashboard" className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent shrink-0">执笔惊鸿</Link>
        </div>
        <div className="flex items-center gap-3 sm:gap-4 overflow-x-auto whitespace-nowrap">
          <Link href="/recharge" className="text-xs sm:text-sm text-purple-400 hover:text-purple-300 transition shrink-0">充值中心</Link>
          <Link href="/dashboard" className="text-xs sm:text-sm text-gray-400 hover:text-white transition shrink-0">工作台</Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold">消费记录</h2>
          <p className="text-sm text-gray-500">共 {total} 条记录</p>
        </div>

        {loading ? (
          <p className="text-gray-500 text-center py-12">加载中...</p>
        ) : records.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <p className="text-lg mb-2">还没有消费记录</p>
            <Link href="/dashboard" className="text-purple-400 hover:text-purple-300">去创作 →</Link>
          </div>
        ) : (
          <>
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase">
                      <th className="text-left px-4 py-3 font-medium">时间</th>
                      <th className="text-left px-4 py-3 font-medium">功能</th>
                      <th className="text-right px-4 py-3 font-medium">消耗字数</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r) => (
                      <tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition">
                        <td className="px-4 py-3 text-gray-400">{new Date(r.created_at).toLocaleString("zh-CN")}</td>
                        <td className="px-4 py-3">{FEATURE_LABELS[r.feature] || r.feature}</td>
                        <td className="px-4 py-3 text-right text-gray-300">{r.words_used.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-6">
                <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
                  className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed rounded text-xs transition">
                  上一页
                </button>
                <span className="px-3 py-1.5 text-xs text-gray-500">{page} / {totalPages}</span>
                <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}
                  className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed rounded text-xs transition">
                  下一页
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
