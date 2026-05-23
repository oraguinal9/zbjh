"use client";

import { Suspense, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { saveSession, signIn, signUp, resetPassword } from "@/lib/auth";

function formatError(msg: string): string {
  if (msg.includes("37") || msg.includes("seconds") || msg.includes("security purposes") || msg.includes("rate limit") || msg.includes("exceeded")) return "操作太频繁，请等40秒后再试";
  if (msg.includes("already registered") || msg.includes("already exists")) return "该邮箱已注册，请直接登录";
  if (msg.includes("Invalid login")) return "邮箱或密码错误";
  if (msg.includes("Email not confirmed")) return "邮箱未验证，请查收确认邮件";
  return msg;
}

function LoginFormInner() {
  const router = useRouter();
  const params = useSearchParams();
  const returnUrl = params.get("return") || "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState<"error"|"success">("error");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startCooldown = () => {
    setCooldown(40);
    const interval = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) { clearInterval(interval); return 0; }
        return c - 1;
      });
    }, 1000);
  };

  const handleSubmit = async () => {
    if (!email || !password) return;
    if (cooldown > 0) return;
    setLoading(true); setMsg("");

    if (isSignUp) {
      const { error } = await signUp(email, password);
      if (error) {
        if (error.message.includes("37") || error.message.includes("seconds") || error.message.includes("security") || error.message.includes("rate limit") || error.message.includes("exceeded")) {
          startCooldown();
        }
        setMsg(formatError(error.message));
        setMsgType("error");
      } else {
        setMsg("注册成功！请查看邮箱确认链接，或直接登录。");
        setMsgType("success");
        setIsSignUp(false);
      }
    } else {
      const { error } = await signIn(email, password);
      if (error) {
        setMsg(formatError(error.message));
        setMsgType("error");
      } else {
        await saveSession();
        router.push(returnUrl);
      }
    }
    setLoading(false);
  };

  const handleResetPassword = async () => {
    if (!email) {
      setMsg("请输入邮箱地址");
      setMsgType("error");
      return;
    }
    setLoading(true); setMsg("");
    const { error } = await resetPassword(email);
    if (error) {
      setMsg(formatError(error.message));
      setMsgType("error");
    } else {
      setMsg("密码重置链接已发送到您的邮箱，请查收。");
      setMsgType("success");
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 w-96">
        <Link href="/" className="text-2xl font-bold text-center mb-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent block">执笔惊鸿</Link>
        <p className="text-center text-gray-500 text-sm mb-6">{isSignUp ? "注册新账号" : "登录"}</p>
        <div className="space-y-4">
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="邮箱" type="email"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-purple-500" />
          {!isSignUp && (
            <>
              <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="密码" type="password"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-purple-500"
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()} />
              <div className="flex justify-end">
                <button onClick={handleResetPassword} disabled={loading}
                  className="text-xs text-gray-500 hover:text-purple-400 transition">
                  忘记密码？
                </button>
              </div>
            </>
          )}
          {isSignUp && (
            <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="密码（至少6位）" type="password"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-purple-500"
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()} />
          )}
          <button onClick={isSignUp ? handleSubmit : handleSubmit} disabled={loading || cooldown > 0}
            className="w-full py-2.5 rounded-lg font-medium bg-purple-600 hover:bg-purple-700 disabled:opacity-50 transition text-sm">
            {loading ? "处理中..." : cooldown > 0 ? `请等待 ${cooldown}s` : isSignUp ? "注册" : "登录"}
          </button>
          {msg && <p className={`text-xs text-center ${msgType === "error" ? "text-red-400" : "text-green-400"}`}>{msg}</p>}
          <p className="text-xs text-gray-500 text-center">
            {isSignUp ? "已有账号？" : "没有账号？"}
            <button onClick={() => { setIsSignUp(!isSignUp); setMsg(""); }} className="text-purple-400 hover:text-purple-300 ml-1">
              {isSignUp ? "去登录" : "去注册"}
            </button>
          </p>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-950 flex items-center justify-center"><p className="text-gray-400">加载中...</p></div>}>
      <LoginFormInner />
    </Suspense>
  );
}
