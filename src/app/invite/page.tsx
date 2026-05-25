"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getToken } from "@/lib/auth";

export default function InvitePage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) { router.push("/login"); return; }
    fetch("/api/invite")
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [router]);

  const handleCopy = () => {
    if (data?.invite_link) {
      navigator.clipboard.writeText(data.invite_link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100">
      <nav className="border-b border-gray-800 px-4 sm:px-6 py-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/" className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent shrink-0">执笔惊鸿</Link>
        </div>
        <div className="flex items-center gap-3 sm:gap-4 overflow-x-auto whitespace-nowrap">
          <Link href="/dashboard" className="text-sm text-gray-400 hover:text-white transition shrink-0">工作台</Link>
          <Link href="/recharge" className="text-sm text-purple-400 hover:text-purple-300 transition shrink-0">充值</Link>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-center mb-2">邀请好友</h1>
        <p className="text-center text-gray-500 mb-8">邀请好友注册，双方各得 10 万字额度</p>

        {loading ? (
          <p className="text-center text-gray-500">加载中...</p>
        ) : data?.error ? (
          <p className="text-center text-red-400">{data.error}</p>
        ) : data ? (
          <div className="space-y-6">
            {/* 邀请码 */}
            <div className="bg-gradient-to-r from-purple-900/40 to-pink-900/40 border border-purple-700 rounded-xl p-6 text-center">
              <p className="text-sm text-gray-400 mb-2">你的邀请码</p>
              <p className="text-4xl font-bold tracking-widest text-white mb-4">{data.invite_code}</p>
              <div className="flex gap-3 justify-center">
                <button onClick={handleCopy}
                  className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition">
                  {copied ? "✅ 已复制" : "📋 复制邀请链接"}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-3">朋友点击链接注册后，你和他各得 10 万字额度</p>
            </div>

            {/* 统计数据 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 text-center">
                <p className="text-2xl font-bold text-purple-400">{data.total_invites}</p>
                <p className="text-xs text-gray-500 mt-1">已邀请好友</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 text-center">
                <p className="text-2xl font-bold text-green-400">{(data.total_rewards / 10000).toFixed(1)}<span className="text-sm text-gray-500">万</span></p>
                <p className="text-xs text-gray-500 mt-1">邀请赚取额度</p>
              </div>
            </div>

            {/* 奖励说明 */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h3 className="font-bold mb-3">奖励规则</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">1</span>
                  <div>
                    <p className="text-gray-200 font-medium">好友通过你的链接注册</p>
                    <p className="text-gray-500 text-xs">你和好友各得 10 万字额度</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-pink-600 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">2</span>
                  <div>
                    <p className="text-gray-200 font-medium">好友首次充值（任意金额）</p>
                    <p className="text-gray-500 text-xs">你再得 20 万字额度</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 最近奖励记录 */}
            {data.rewards?.length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h3 className="font-bold mb-3">最近奖励</h3>
                <div className="space-y-2">
                  {data.rewards.slice(0, 10).map((r: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">
                        {r.reason === "signup_bonus" && "🎉 注册奖励"}
                        {r.reason === "referral_bonus" && "🤝 邀请奖励"}
                        {r.reason === "recharge_bonus" && "💰 充值返利"}
                      </span>
                      <span className="text-green-400 font-medium">+{(r.words / 10000).toFixed(0)}万</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-center text-gray-500">加载失败</p>
        )}
      </div>
    </main>
  );
}
