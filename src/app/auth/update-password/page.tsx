"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { updatePassword, saveSession } from "@/lib/auth";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState<"error"|"success">("error");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Supabase automatically handles the recovery token via onAuthStateChange
    // The session is already set when redirected here
  }, []);

  const handleSubmit = async () => {
    if (password.length < 6) {
      setMsg("密码至少6位"); setMsgType("error"); return;
    }
    if (password !== confirm) {
      setMsg("两次输入的密码不一致"); setMsgType("error"); return;
    }
    setLoading(true); setMsg("");
    const { error } = await updatePassword(password);
    if (error) {
      setMsg(error.message); setMsgType("error");
    } else {
      await saveSession();
      setMsg("密码修改成功！"); setMsgType("success");
      setTimeout(() => router.push("/dashboard"), 1500);
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 w-96">
        <h1 className="text-xl font-bold text-center mb-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">设置新密码</h1>
        <p className="text-center text-gray-500 text-sm mb-6">请输入您的新密码</p>
        <div className="space-y-4">
          <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="新密码（至少6位）" type="password"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-purple-500" />
          <input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="确认新密码" type="password"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-purple-500"
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()} />
          <button onClick={handleSubmit} disabled={loading || !password || !confirm}
            className="w-full py-2.5 rounded-lg font-medium bg-purple-600 hover:bg-purple-700 disabled:opacity-50 transition text-sm">
            {loading ? "处理中..." : "确认修改"}
          </button>
          {msg && <p className={`text-xs text-center ${msgType === "error" ? "text-red-400" : "text-green-400"}`}>{msg}</p>}
        </div>
      </div>
    </main>
  );
}
