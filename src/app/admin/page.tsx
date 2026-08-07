"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";

interface AdminOrder {
  id: string;
  order_no: string;
  amount: number;
  words: number;
  package_type: string;
  status: string;
  payment_method: string;
  created_at: string;
  submitted_at: string | null;
  reviewed_at: string | null;
  review_note: string;
  proof_note: string;
  has_image: boolean;
  email: string;
}

const PAY_LABEL: Record<string, string> = { alipay: "支付宝", wechat: "微信" };
const PKG_LABEL: Record<string, string> = { first: "首充", renew: "续费" };

export default function AdminPage() {
  const [adminKey, setAdminKey] = useState("");
  const [submitted, setSubmitted] = useState<AdminOrder[]>([]);
  const [recent, setRecent] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [proofModal, setProofModal] = useState<string | null>(null);
  const [proofLoading, setProofLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const getKey = () => {
    if (typeof window === "undefined") return "";
    return sessionStorage.getItem("zbjh_admin_key") || "";
  };

  useEffect(() => {
    const k = getKey();
    if (k) { setAdminKey(k); fetchOrders(k); }
  }, []);

  const fetchOrders = useCallback(async (key: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/orders", { headers: { "x-admin-key": key } });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "加载失败"); setLoading(false); return; }
      setSubmitted(data.submitted || []);
      setRecent(data.recent || []);
    } catch {
      setError("网络错误");
    } finally {
      setLoading(false);
    }
  }, []);

  function handleSaveKey() {
    if (!adminKey.trim()) return;
    sessionStorage.setItem("zbjh_admin_key", adminKey.trim());
    fetchOrders(adminKey.trim());
  }

  async function viewProof(orderId: string) {
    setProofLoading(true);
    try {
      const res = await fetch(`/api/admin/order-proof?id=${orderId}`, { headers: { "x-admin-key": getKey() } });
      const data = await res.json();
      if (data.proof_image) setProofModal(data.proof_image);
      else alert("该订单没有上传截图");
    } catch {
      alert("截图加载失败");
    } finally {
      setProofLoading(false);
    }
  }

  async function review(order: AdminOrder, action: "approve" | "reject") {
    let reason = "";
    if (action === "reject") {
      reason = window.prompt("请输入驳回原因（用户可见）：", "凭证不符，请重新提交") || "";
      if (!reason) return;
    }
    if (action === "approve" && !window.confirm(`确认给 ${order.email} 的订单 ${order.order_no}（¥${order.amount}）到账？`)) return;

    setBusy(order.id);
    try {
      const res = await fetch("/api/payment/review", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": getKey() },
        body: JSON.stringify({ order_no: order.order_no, action, reason }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error || "操作失败"); return; }
      alert(data.message || "操作成功");
      fetchOrders(getKey());
    } catch {
      alert("网络错误");
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100">
      <nav className="border-b border-gray-800 px-4 sm:px-6 py-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">充值审核后台</h1>
          <Link href="/" className="text-xs text-gray-500 hover:text-white transition">返回网站</Link>
        </div>
        {getKey() && (
          <button
            onClick={() => { sessionStorage.removeItem("zbjh_admin_key"); setAdminKey(""); setSubmitted([]); setRecent([]); }}
            className="text-xs text-gray-500 hover:text-white transition"
          >
            退出
          </button>
        )}
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {!getKey() ? (
          <div className="max-w-sm mx-auto bg-gray-900 border border-gray-800 rounded-xl p-6 text-center mt-16">
            <p className="text-3xl mb-3">🔑</p>
            <p className="text-sm text-gray-400 mb-4">请输入管理员密钥进入审核后台</p>
            <input
              type="password"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSaveKey()}
              placeholder="管理员密钥"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-purple-500 mb-3 placeholder-gray-600"
            />
            <button onClick={handleSaveKey} className="w-full py-2.5 rounded-lg font-medium bg-purple-600 hover:bg-purple-700 transition text-sm">
              进入
            </button>
            {error && <p className="text-xs text-red-400 mt-3">{error}</p>}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">待审核订单（{submitted.length}）</h2>
              <button
                onClick={() => fetchOrders(getKey())}
                disabled={loading}
                className="text-xs px-3 py-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 rounded-lg transition"
              >
                {loading ? "刷新中..." : "🔄 刷新"}
              </button>
            </div>

            {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

            {loading ? (
              <p className="text-gray-500 text-center py-12">加载中...</p>
            ) : submitted.length === 0 ? (
              <div className="text-center py-16 text-gray-500 border border-dashed border-gray-800 rounded-xl">
                <p className="text-lg mb-1">暂无待审核订单</p>
                <p className="text-xs text-gray-600">用户提交凭证后会显示在这里</p>
              </div>
            ) : (
              <div className="space-y-3 mb-10">
                {submitted.map((o) => (
                  <div key={o.id} className="bg-gray-900 border border-amber-700/50 rounded-xl p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        <p className="text-sm font-bold">
                          {o.email}
                          <span className="ml-2 text-xs font-normal text-gray-500">{o.order_no}</span>
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          ¥{o.amount} · {(o.words / 10000).toFixed(0)}万字 · {PKG_LABEL[o.package_type] || o.package_type} · {PAY_LABEL[o.payment_method] || o.payment_method} · 提交于 {o.submitted_at ? new Date(o.submitted_at).toLocaleString("zh-CN") : "-"}
                        </p>
                        {o.proof_note && <p className="text-xs text-gray-500 mt-1">备注：{o.proof_note}</p>}
                      </div>
                      <div className="flex gap-2 shrink-0">
                        {o.has_image && (
                          <button
                            onClick={() => viewProof(o.id)}
                            disabled={proofLoading}
                            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 rounded-lg text-xs transition"
                          >
                            查看截图
                          </button>
                        )}
                        <button
                          onClick={() => review(o, "approve")}
                          disabled={busy === o.id}
                          className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg text-xs transition"
                        >
                          确认到账
                        </button>
                        <button
                          onClick={() => review(o, "reject")}
                          disabled={busy === o.id}
                          className="px-3 py-1.5 bg-red-900/50 hover:bg-red-900 disabled:opacity-50 rounded-lg text-xs transition"
                        >
                          驳回
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {recent.length > 0 && (
              <>
                <h2 className="text-lg font-bold mb-4">最近已处理</h2>
                <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase">
                          <th className="text-left px-4 py-3 font-medium">用户</th>
                          <th className="text-left px-4 py-3 font-medium">订单号</th>
                          <th className="text-right px-4 py-3 font-medium">金额</th>
                          <th className="text-left px-4 py-3 font-medium">状态</th>
                          <th className="text-left px-4 py-3 font-medium">处理时间</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recent.map((o) => (
                          <tr key={o.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition">
                            <td className="px-4 py-3 text-gray-300">{o.email}</td>
                            <td className="px-4 py-3 font-mono text-xs text-gray-400">{o.order_no}</td>
                            <td className="px-4 py-3 text-right">¥{o.amount}</td>
                            <td className="px-4 py-3">
                              <span className={`text-xs ${o.status === "paid" ? "text-green-400" : "text-red-400"}`}>
                                {o.status === "paid" ? "已到账" : `已驳回${o.review_note ? "：" + o.review_note : ""}`}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-500 text-xs">{o.reviewed_at ? new Date(o.reviewed_at).toLocaleString("zh-CN") : "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </main>

      {/* 截图预览 */}
      {proofModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={() => setProofModal(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={proofModal} alt="付款截图" className="max-h-[85vh] max-w-full rounded-lg" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </main>
  );
}
