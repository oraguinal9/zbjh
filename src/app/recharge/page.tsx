"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface OrderInfo {
  id: string;
  order_no: string;
  amount: number;
  words: number;
  package_type: string;
  status: string;
}

interface OrderRecord {
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
}

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  pending: { text: "待支付", cls: "text-gray-400 border-gray-700" },
  submitted: { text: "审核中", cls: "text-amber-400 border-amber-700" },
  paid: { text: "已到账", cls: "text-green-400 border-green-700" },
  rejected: { text: "已驳回", cls: "text-red-400 border-red-700" },
};

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 900;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("无法处理图片")); return; }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.72));
      };
      img.onerror = () => reject(new Error("图片读取失败"));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error("图片读取失败"));
    reader.readAsDataURL(file);
  });
}

export default function RechargePage() {
  const router = useRouter();
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [orderResult, setOrderResult] = useState<OrderInfo | null>(null);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [payMethod, setPayMethod] = useState<"alipay" | "wechat">("alipay");
  const [proofNote, setProofNote] = useState("");
  const [proofImage, setProofImage] = useState("");
  const [proofSubmitting, setProofSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState("");
  const [submitErr, setSubmitErr] = useState("");

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/payment/orders");
      if (res.status === 401) { router.push("/login"); return; }
      const data = await res.json();
      setOrders(data.orders || []);
    } catch {}
  }, [router]);

  useEffect(() => {
    fetchBalance();
    fetchOrders();
  }, [fetchOrders]);

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
    setSubmitMsg("");
    setSubmitErr("");
    setProofNote("");
    setProofImage("");
    try {
      const res = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error); return; }
      setOrderResult(data.order);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e: any) {
      alert("创建订单失败");
    } finally {
      setCreating(false);
    }
  }

  async function handleSubmitProof() {
    if (!orderResult) return;
    if (!proofImage) { setSubmitErr("请先上传付款截图"); return; }
    setProofSubmitting(true);
    setSubmitErr("");
    setSubmitMsg("");
    try {
      const res = await fetch("/api/payment/submit-proof", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_no: orderResult.order_no,
          note: proofNote,
          image: proofImage,
          payment_method: payMethod,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setSubmitErr(data.error || "提交失败"); return; }
      setSubmitMsg(data.message || "已提交，等待审核");
      setOrderResult(null);
      fetchOrders();
      // 提交后轮询订单状态，到账或驳回时自动刷新
      let tries = 0;
      const timer = setInterval(async () => {
        tries += 1;
        const r = await fetch("/api/payment/orders");
        if (r.ok) {
          const d = await r.json();
          setOrders(d.orders || []);
          const target = (d.orders || []).find((o: OrderRecord) => o.order_no === orderResult.order_no);
          if ((target && target.status !== "submitted") || tries >= 12) clearInterval(timer);
        }
      }, 10000);
    } catch (e: any) {
      setSubmitErr("网络错误，请重试");
    } finally {
      setProofSubmitting(false);
    }
  }

  async function handleUpload(file: File | null) {
    if (!file) return;
    setSubmitErr("");
    try {
      const dataUrl = await compressImage(file);
      if (dataUrl.length > 2_400_000) { setSubmitErr("图片过大，请换一张更小的"); return; }
      setProofImage(dataUrl);
    } catch (e: any) {
      setSubmitErr(e.message || "图片处理失败");
    }
  }

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100">
      <nav className="border-b border-gray-800 px-4 sm:px-6 py-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/dashboard" className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent shrink-0">
            执笔惊鸿
          </Link>
        </div>
        <div className="flex items-center gap-3 sm:gap-4 overflow-x-auto whitespace-nowrap">
          <Link href="/usage" className="text-xs text-gray-500 hover:text-purple-400 transition shrink-0">消费记录</Link>
          <Link href="/dashboard" className="text-xs sm:text-sm text-gray-400 hover:text-white transition shrink-0">工作台</Link>
        </div>
      </nav>

      <main className="max-w-lg mx-auto px-6 py-12">
        <h2 className="text-3xl font-bold text-center mb-2">充值中心</h2>
        <p className="text-gray-400 text-center mb-8">扫码付款 → 提交凭证 → 人工审核到账</p>

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
          <div className="bg-gray-900 border border-purple-600 rounded-xl p-6 relative overflow-hidden">
            <div className="absolute top-2 right-2 bg-purple-600 text-xs px-2 py-0.5 rounded-full">推荐</div>
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-lg font-bold">首充特惠</h3>
                <p className="text-sm text-gray-400">仅限首次</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-purple-400">¥39.9</p>
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

          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-lg font-bold">续费充值</h3>
                <p className="text-sm text-gray-400">再次购买</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-100">¥59.9</p>
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

        {/* 付款流程 */}
        {orderResult && (
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 mb-8">
            <h3 className="font-bold mb-3">💳 付款并提交凭证</h3>
            <div className="text-sm text-gray-400 space-y-1 mb-4">
              <p>
                订单号：
                <span className="text-gray-200 font-mono">{orderResult.order_no}</span>
                <button
                  onClick={() => navigator.clipboard.writeText(orderResult.order_no)}
                  className="ml-2 text-xs text-purple-400 hover:text-purple-300 transition"
                >
                  复制
                </button>
              </p>
              <p>金额：<span className="text-purple-400 font-bold">¥{orderResult.amount}</span></p>
              <p>额度：{(orderResult.words / 10000).toFixed(0)}万字</p>
            </div>

            {/* 支付方式切换 + 收款码 */}
            <div className="flex gap-2 mb-4">
              {(["alipay", "wechat"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setPayMethod(m)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-medium transition ${payMethod === m ? "bg-purple-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"}`}
                >
                  {m === "alipay" ? "支付宝" : "微信"}
                </button>
              ))}
            </div>
            <div className="flex flex-col items-center bg-gray-950/60 rounded-xl p-4 mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={payMethod === "alipay" ? "/images/alipay-qr.png" : "/images/wechat-qr.png"}
                alt={payMethod === "alipay" ? "支付宝收款码" : "微信收款码"}
                className="w-52 h-52 object-contain rounded-lg bg-white"
              />
              <p className="text-xs text-gray-500 mt-3">
                请用{payMethod === "alipay" ? "支付宝" : "微信"}扫码支付 ¥{orderResult.amount}
              </p>
            </div>

            {/* 凭证输入 */}
            <div className="space-y-3">
              <input
                value={proofNote}
                onChange={(e) => setProofNote(e.target.value)}
                placeholder="转账单号 / 付款备注（选填，方便核对）"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-purple-500 placeholder-gray-600"
              />
              <label className="block">
                <span className="text-xs text-gray-400 mb-1 block">付款截图（必传，用于人工核对）</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleUpload(e.target.files?.[0] || null)}
                  className="block w-full text-xs text-gray-400 file:mr-3 file:px-4 file:py-2 file:rounded-lg file:border-0 file:bg-gray-800 file:text-gray-200 file:text-xs hover:file:bg-gray-700 transition"
                />
              </label>
              {proofImage && (
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={proofImage} alt="付款截图预览" className="h-24 rounded-lg border border-gray-700" />
                  <span className="text-xs text-gray-500">截图已压缩上传，点击右侧重新选择可更换</span>
                </div>
              )}
              {submitErr && <p className="text-xs text-red-400">{submitErr}</p>}
              <button
                onClick={handleSubmitProof}
                disabled={proofSubmitting}
                className="w-full py-3 rounded-lg font-medium bg-green-600 hover:bg-green-700 disabled:opacity-50 transition"
              >
                {proofSubmitting ? "提交中..." : "📤 提交凭证，等待审核"}
              </button>
              {submitMsg && <p className="text-sm text-green-400 text-center">{submitMsg}</p>}
            </div>
          </div>
        )}

        {/* 我的充值订单 */}
        {orders.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm">我的充值订单</h3>
              <button onClick={fetchOrders} className="text-xs text-gray-500 hover:text-purple-400 transition">刷新</button>
            </div>
            <div className="space-y-2">
              {orders.map((o) => {
                const st = STATUS_LABEL[o.status] || STATUS_LABEL.pending;
                return (
                  <div key={o.id} className="bg-gray-900/70 border border-gray-800 rounded-xl px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-mono text-gray-300 truncate">{o.order_no}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          ¥{o.amount} · {(o.words / 10000).toFixed(0)}万字 · {o.package_type === "first" ? "首充" : "续费"} · {new Date(o.created_at).toLocaleString("zh-CN")}
                        </p>
                        {o.status === "rejected" && o.review_note && (
                          <p className="text-xs text-red-400 mt-1">驳回原因：{o.review_note}</p>
                        )}
                      </div>
                      <span className={`shrink-0 text-xs border rounded-full px-2.5 py-1 ${st.cls}`}>{st.text}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-8 text-center text-xs text-gray-600">
          <p>付款后请务必提交凭证，人工核对后自动到账</p>
          <p className="mt-1">审核时间一般 1~24 小时，如有问题请联系客服</p>
        </div>
      </main>
    </main>
  );
}
