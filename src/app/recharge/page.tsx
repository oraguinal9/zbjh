"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RechargePage() {
  const router = useRouter();
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [orderResult, setOrderResult] = useState<any>(null);

  useEffect(() => {
    fetchBalance();
  }, []);

  async function fetchBalance() {
    try {
      const res = await fetch("/api/payment/balance");
      if (res.status === 401) { router.push("/login"); return; }
      const data = await res.json();
      setBalance(data.remaining_words ?? 0);
    } catch {} finally {
      setLoading(false);
    }
  }

  async function handleRecharge(type: "first" | "renew") {
    setCreating(true);
    setOrderResult(null);
    try {
      const res = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error); return; }
      setOrderResult(data.order);
    } catch (e: any) {
      alert("创建订单失败");
    } finally {
      setCreating(false);
    }
  }

  async function handleConfirmPayment() {
    if (!orderResult) return;
    try {
      const res = await fetch("/api/payment/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_no: orderResult.order_no,
          mock_admin_key: "test",
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert("充值成功！");
        setOrderResult(null);
        fetchBalance();
      } else {
        alert(data.error || "充值确认失败");
      }
    } catch {
      alert("网络错误");
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <nav className="border-b border-gray-800 px-4 sm:px-6 py-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-3">
          <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent shrink-0">
            执笔惊鸿
          </h1>
        </div>
        <div className="flex items-center gap-3 sm:gap-4 overflow-x-auto whitespace-nowrap">
          <button onClick={() => router.push("/usage")} className="text-xs text-gray-500 hover:text-purple-400 transition shrink-0">
            消费记录
          </button>
          <button onClick={() => router.push("/dashboard")} className="text-xs sm:text-sm text-gray-400 hover:text-white transition shrink-0">
            工作台
          </button>
        </div>
      </nav>

      <main className="max-w-lg mx-auto px-6 py-12">
        <h2 className="text-3xl font-bold text-center mb-2">充值中心</h2>
        <p className="text-gray-400 text-center mb-8">按字数付费，用多少充多少</p>

        {!loading && balance !== null && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center mb-8">
            <p className="text-gray-400 text-sm mb-1">当前剩余额度</p>
            <p className="text-3xl font-bold text-purple-400">
              {(balance / 10000).toFixed(1)}<span className="text-lg text-gray-500">万字</span>
            </p>
            <p className="text-xs text-gray-600 mt-1">（{balance.toLocaleString()} 字）</p>
          </div>
        )}

        {/* 套餐选择 */}
        <div className="space-y-4 mb-8">
          {/* 首充 */}
          <div className="bg-gray-900 border border-purple-600 rounded-xl p-6 relative overflow-hidden">
            <div className="absolute top-2 right-2 bg-purple-600 text-xs px-2 py-0.5 rounded-full">推荐</div>
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-lg font-bold">首充特惠</h3>
                <p className="text-sm text-gray-400">仅限首次</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-purple-400">¥9.9</p>
                <p className="text-xs text-gray-500">一次性</p>
              </div>
            </div>
            <p className="text-sm text-gray-300 mb-4">100万字额度 = 写完一本百万字小说</p>
            <button
              onClick={() => handleRecharge("first")}
              disabled={creating}
              className="w-full py-3 rounded-lg font-medium bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 transition"
            >
              {creating ? "创建订单中..." : "立即购买"}
            </button>
          </div>

          {/* 续费 */}
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-lg font-bold">续费充值</h3>
                <p className="text-sm text-gray-400">再次购买</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-100">¥19.9</p>
                <p className="text-xs text-gray-500">一次性</p>
              </div>
            </div>
            <p className="text-sm text-gray-300 mb-4">100万字额度 = 再写一本百万字小说</p>
            <button
              onClick={() => handleRecharge("renew")}
              disabled={creating}
              className="w-full py-3 rounded-lg font-medium bg-gray-800 hover:bg-gray-700 disabled:opacity-50 transition"
            >
              {creating ? "创建订单中..." : "立即购买"}
            </button>
          </div>
        </div>

        {/* 订单确认（mock支付） */}
        {orderResult && (
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6">
            <h3 className="font-bold mb-3">订单信息</h3>
            <div className="text-sm text-gray-400 space-y-1 mb-4">
              <p>订单号：{orderResult.order_no}</p>
              <p>金额：¥{orderResult.amount}</p>
              <p>额度：{(orderResult.words / 10000).toFixed(0)}万字</p>
              <p>类型：{orderResult.package_type === "first" ? "首充特惠" : "续费充值"}</p>
              <p>状态：待支付</p>
            </div>
            <p className="text-xs text-gray-500 mb-3">支付方式：支付宝（对接中，当前为模拟支付）</p>
            <button
              onClick={handleConfirmPayment}
              className="w-full py-3 rounded-lg font-medium bg-green-600 hover:bg-green-700 transition"
            >
              模拟支付确认
            </button>
          </div>
        )}

        <div className="mt-8 text-center text-xs text-gray-600">
          <p>支付即表示同意《用户协议》</p>
          <p className="mt-1">如有问题请联系客服</p>
        </div>
      </main>
    </div>
  );
}
