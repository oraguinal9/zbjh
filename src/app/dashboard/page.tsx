"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authFetch, getToken, signOut } from "@/lib/auth";

interface Project {
  id: string;
  title: string;
  genre: string;
  status: string;
  updated_at: string;
}

interface UserProfile {
  email: string;
  id: string;
  created_at?: string;
}

export default function Dashboard() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [changePwd, setChangePwd] = useState(false);
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdMsg, setPwdMsg] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  const totalPages = Math.ceil(projects.length / PAGE_SIZE);
  const showPagination = totalPages > 1;
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) { router.push("/login"); return; }

    authFetch("/api/auth/me").then(r => r.json()).then(d => {
      if (d.email) setProfile(d);
    }).catch(() => {});

    authFetch("/api/projects")
      .then((r) => { return r.json(); })
      .then((data) => { setProjects(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));

    fetch("/api/payment/balance")
      .then(r => r.json()).then(d => setBalance(d.remaining_words ?? null)).catch(() => {});
  }, [router]);

  const deleteProject = async (id: string) => {
    await authFetch("/api/projects", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setProjects(projects.filter((p) => p.id !== id));
  };

  const handleLogout = async () => {
    await signOut();
    router.push("/");
  };

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100">
      <nav className="border-b border-gray-800 px-4 sm:px-6 py-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/" className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent shrink-0">执笔惊鸿</Link>
          <Link href="/recharge"
            className={`text-xs transition border rounded px-2 py-0.5 shrink-0 ${
              balance !== null && balance > 0
                ? "text-gray-500 hover:text-purple-400 border-gray-700"
                : "text-purple-400 border-purple-600 hover:bg-purple-600/10"
            }`}>
            {balance !== null ? `余额 ${(balance / 10000).toFixed(1)}万` : "去充值"}
          </Link>
        </div>
        <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto whitespace-nowrap max-w-[50vw] sm:max-w-none">
          <Link href="/invite" className="text-xs text-amber-400 hover:text-amber-300 transition shrink-0">🎁 邀请</Link>
          {profile && (
            <div className="relative">
              <button onClick={() => setShowProfile(!showProfile)}
                className="flex items-center gap-2 text-xs text-gray-400 hover:text-white transition bg-gray-800 rounded-lg px-3 py-1.5 shrink-0">
                <span className="w-5 h-5 rounded-full bg-purple-600 flex items-center justify-center text-white text-[10px] font-bold">
                  {profile.email[0].toUpperCase()}
                </span>
                <span className="hidden sm:inline">{profile.email}</span>
              </button>
              {showProfile && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowProfile(false)} />
                  <div className="absolute right-0 top-full mt-2 z-20 w-64 bg-gray-900 border border-gray-700 rounded-xl p-4 shadow-xl">
                    <p className="text-sm font-bold text-white mb-3">账户信息</p>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-500">邮箱</span>
                        <span className="text-gray-300">{profile.email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">用户ID</span>
                        <span className="text-gray-300 font-mono">{profile.id.slice(0, 8)}...</span>
                      </div>
                      {profile.created_at && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">注册时间</span>
                          <span className="text-gray-300">{new Date(profile.created_at).toLocaleDateString("zh-CN")}</span>
                        </div>
                      )}
                    </div>
                    <hr className="border-gray-800 my-3" />
                    {!changePwd ? (
                      <button onClick={() => setChangePwd(true)}
                        className="w-full text-xs text-purple-400 hover:text-purple-300 text-center py-1.5 rounded-lg hover:bg-gray-800 transition mb-1">
                        修改密码
                      </button>
                    ) : (
                      <div className="space-y-2 mb-2">
                        <input value={newPwd} onChange={(e) => setNewPwd(e.target.value)} placeholder="新密码（至少6位）" type="password"
                          className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-purple-500" />
                        <input value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} placeholder="确认新密码" type="password"
                          className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-purple-500" />
                        {pwdMsg && <p className="text-xs text-red-400">{pwdMsg}</p>}
                        <div className="flex gap-2">
                          <button onClick={async () => {
                            if (newPwd.length < 6) { setPwdMsg("密码至少6位"); return; }
                            if (newPwd !== confirmPwd) { setPwdMsg("两次密码不一致"); return; }
                            const { updatePassword } = await import("@/lib/auth");
                            const { error } = await updatePassword(newPwd);
                            if (error) { setPwdMsg(error.message); return; }
                            setPwdMsg(""); setChangePwd(false); setNewPwd(""); setConfirmPwd("");
                            setShowProfile(false);
                          }} className="flex-1 text-xs bg-purple-600 hover:bg-purple-700 rounded py-1.5 text-center">确认</button>
                          <button onClick={() => { setChangePwd(false); setNewPwd(""); setConfirmPwd(""); setPwdMsg(""); }}
                            className="flex-1 text-xs bg-gray-700 hover:bg-gray-600 rounded py-1.5 text-center">取消</button>
                        </div>
                      </div>
                    )}
                    <button onClick={handleLogout}
                      className="w-full text-xs text-red-400 hover:text-red-300 text-center py-1.5 rounded-lg hover:bg-gray-800 transition">
                      退出登录
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
          {!profile && <span className="text-xs text-gray-500">加载中...</span>}
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold">我的作品</h2>
          <div className="flex gap-3">
            <Link href="/" className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm transition">+ 新建</Link>
          </div>
        </div>

        {loading ? (
          <p className="text-gray-500">加载中...</p>
        ) : projects.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <p className="text-lg mb-2">还没有作品</p>
            <Link href="/" className="text-purple-400 hover:text-purple-300">去创建第一部小说 →</Link>
          </div>
        ) : (
          <>
            <div className="grid gap-4">
              {projects.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((p) => (
                <Link key={p.id} href={`/project/${p.id}`}
                  className="block bg-gray-900 border border-gray-800 hover:border-purple-700 rounded-xl p-5 transition group">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold group-hover:text-purple-400 transition">{p.title}</h3>
                      <div className="flex gap-3 mt-1 text-sm text-gray-500">
                        <span>{p.genre}</span>
                        <span>{p.status === "draft" ? "草稿" : p.status === "writing" ? "连载中" : "已完结"}</span>
                        <span>更新于 {new Date(p.updated_at).toLocaleDateString("zh-CN")}</span>
                      </div>
                    </div>
                    <button onClick={(e) => { e.preventDefault(); deleteProject(p.id); }}
                      className="text-gray-700 hover:text-red-500 text-sm transition">删除</button>
                  </div>
                </Link>
              ))}
            </div>
            {showPagination && (
              <div className="flex justify-center gap-2 mt-6">
                <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
                  className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed rounded text-xs transition">
                  上一页
                </button>
                {Array.from({ length: totalPages }, (_, i) => (
                  <button key={i} onClick={() => setPage(i + 1)}
                    className={`px-3 py-1.5 rounded text-xs transition ${page === i + 1 ? "bg-purple-600 text-white" : "bg-gray-800 hover:bg-gray-700"}`}>
                    {i + 1}
                  </button>
                ))}
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
