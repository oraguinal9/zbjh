"use client";

import Link from "next/link";

const quickstart = [
  "打开网站，点击右上角【登录】注册账号",
  "在首页输入小说思路，点击「一键生成完整大纲」",
  "将大纲保存到「我的作品」",
  "进入作品，用 AI 续写功能逐章创作",
  "余额不足时到充值中心购买额度",
];

const features = [
  { name: "AI 续写", desc: "自动获取前两章结尾 + 角色设定，根据章纲续写。流式输出，边生成边显示。" },
  { name: "去 AI 味（润色）", desc: "打破排比句式、增加口语化、减少「不是…而是…」句式、让对话更自然。" },
  { name: "补字数（扩写）", desc: "保持原意和风格，丰富环境描写、动作神态、心理活动和对话。" },
  { name: "AI 起名", desc: "根据思路和题材，生成 5 个番茄风格爆款书名（8-15 字，带钩子感）。" },
  { name: "AI 角色生成", desc: "从大纲中自动提取主角、反派、配角，保存到项目角色列表。" },
  { name: "文风样本", desc: "上传你自己的章节作为风格参考，AI续写/润色/扩写时模仿你的句式和节奏。" },
  { name: "智能拆书", desc: "分析核心爽点、节奏规律、人设公式、结构模板，支持生成同风格新书。" },
];

const packages = [
  { type: "首充特惠", price: "¥9.9", words: "100 万字", note: "仅限首次", highlight: true },
  { type: "续费充值", price: "¥19.9", words: "100 万字", note: "后续充值", highlight: false },
];

const tips = [
  "先写章纲再续写，AI 生成质量大幅提升",
  "在编辑器设置字数目标（2000-3000 字为最佳章节长度）",
  "首充 9.9 元 = 100 万字额度，足够写完一部百万字小说",
  "对话占比 60%+ 是番茄爆款的重要指标，编辑器会自动统计",
  "生成大纲后，可用 AI 角色功能自动提取角色信息",
  "在编辑器设置「文风样本」，AI 续写/润色/扩写会模仿你的个人风格",
  "邀请好友注册，双方各得 10 万字额度，好友充值你还能再得 20 万字",
];

function HelpPage() {
  return (
    <main className="min-h-screen bg-gray-950 text-gray-100">
      <nav className="border-b border-gray-800 px-4 sm:px-6 py-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/" className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent shrink-0">
            执笔惊鸿
          </Link>
        </div>
        <div className="flex items-center gap-3 sm:gap-4 overflow-x-auto whitespace-nowrap">
          <Link href="/platforms" className="text-xs text-gray-500 hover:text-white transition shrink-0">平台</Link>
          <Link href="/dashboard" className="text-sm text-gray-400 hover:text-white transition shrink-0">工作台</Link>
          <Link href="/login" className="text-sm text-gray-400 hover:text-white transition shrink-0">登录</Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-center mb-2">使用手册</h1>
        <p className="text-center text-gray-500 mb-12">一站式 AI 网文创作工具，从大纲到完本</p>

        {/* 快速上手 */}
        <section className="mb-12">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">⚡ 快速上手</h2>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <ol className="space-y-3">
              {quickstart.map((step, i) => (
                <li key={i} className="flex items-start gap-3 text-sm">
                  <span className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{i + 1}</span>
                  <span className="text-gray-300">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* AI 功能详解 */}
        <section className="mb-12">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">🤖 AI 功能详解</h2>
          <div className="grid gap-3">
            {features.map((f, i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h3 className="font-bold text-purple-400 mb-1">{f.name}</h3>
                <p className="text-sm text-gray-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 充值计费 */}
        <section className="mb-12">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">💰 充值计费</h2>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            {packages.map((p, i) => (
              <div key={i} className={`bg-gray-900 border rounded-xl p-5 ${p.highlight ? "border-purple-600" : "border-gray-700"}`}>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold">{p.type}</h3>
                  {p.highlight && <span className="text-xs bg-purple-600 px-2 py-0.5 rounded-full">推荐</span>}
                </div>
                <p className="text-2xl font-bold text-purple-400">{p.price}</p>
                <p className="text-sm text-gray-400">{p.words} 额度</p>
                <p className="text-xs text-gray-500">{p.note}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-500 bg-gray-900 border border-gray-800 rounded-xl p-4">
            📌 AI 输出多少字扣多少字，流式按实际生成扣费，非流式按结果扣费。
          </p>
        </section>

        {/* 使用技巧 */}
        <section className="mb-12">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">💡 使用技巧</h2>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-3">
            {tips.map((tip, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span className="text-purple-400 shrink-0">•</span>
                <span className="text-gray-400">{tip}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

export default HelpPage;
