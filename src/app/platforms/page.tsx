"use client";

import { useState } from "react";
import Link from "next/link";

type Platform = "fanqie" | "qimao" | "feilu" | "qidian";

const platforms: { key: Platform; label: string; color: string }[] = [
  { key: "fanqie", label: "番茄小说", color: "from-red-500 to-orange-500" },
  { key: "qimao", label: "七猫小说", color: "from-blue-500 to-cyan-500" },
  { key: "feilu", label: "飞卢小说", color: "from-purple-500 to-indigo-500" },
  { key: "qidian", label: "起点中文网", color: "from-green-500 to-teal-500" },
];

const content: Record<Platform, { title: string; sections: { title: string; items: string[] }[] }> = {
  fanqie: {
    title: "番茄小说",
    sections: [
      {
        title: "注册与实名",
        items: [
          "年满 18 周岁，本人二代身份证 + 本人银行卡（开通网银）",
          "手机端：下载「番茄作家助手」APP → 实名认证",
          "电脑端：番茄小说网 → 作家专区 → 工作台 → 账号设置 → 去实名",
          "手机号和银行卡归属人必须与实名信息一致",
        ],
      },
      {
        title: "发布规则",
        items: [
          "单章建议 2000 字左右，段落不超过 4 行",
          "简介最佳 300 字左右，突出冲突和亮点",
          "封面必须有（5 元左右可做一个）",
          "笔名简单利落，不带数字，不擦边",
        ],
      },
      {
        title: "签约制度（三振出局）",
        items: [
          "2 万字首次获得申请按钮（仅 1 次评估机会）",
          "5 万字可第二次申请，8 万字最后一次",
          "建议写 3 万字再提交，打磨好前 3 章",
          "两轮审核：安全审核（2-5 天）+ 编辑评估（2-5 天）",
          "周末和节假日不审核，建议工作日上午申请",
        ],
      },
      {
        title: "稿费与全勤",
        items: [
          "广告分成模式，读者翻页看广告你赚钱",
          "全勤需：听读收益 ≥ 500 元/月 + 签约满 10 万字",
          "日更 4000 字 → 500 元/月",
          "日更 6000 字 → 1000 元/月",
          "日更 8000 字 → 1500 元/月",
        ],
      },
      {
        title: "推荐流程",
        items: [
          "8 万字手动点击开始推荐（或等 15 万字自动）",
          "验证期 7 天：前 3 天必须日更 4000+ 字",
          "首秀期：最大一波流量",
          "20-50 万字可书测，换书名+封面 A/B 测试",
        ],
      },
    ],
  },
  qimao: {
    title: "七猫小说",
    sections: [
      {
        title: "注册方式（三种）",
        items: [
          "APP 端：七猫免费小说 → 我的 → 成为作家 → 实名认证",
          "PC 端：七猫中文网 → 作者中心 → 填写信息 + 上传证件",
          "微信端：七猫小说服务号 → 作家入驻 → 微信一键授权",
          "新账号默认无创作权限，需完成实名认证并申请开通",
        ],
      },
      {
        title: "发布规则",
        items: [
          "书名 2-20 个字，简介不少于 200 字（建议 200-500 字）",
          "封面 800×1200 像素，JPG/PNG，≤5MB",
          "章节纯文字，禁止带格式粘贴",
          "状态可选：连载（即时发布）、入库（仅存档）、完本",
        ],
      },
      {
        title: "签约模式",
        items: [
          "内投（推荐）：2 万字正文 + 大纲，1-3 天审核",
          "线上直发：4000 字即可申请，3-5 天审核",
          "保底+分成（新人首选）：千字 20-1000 元保底",
          "纯分成：无保底，直接分成",
          "超级纯分成（2026 新政）：优化版纯分成+高全勤",
        ],
      },
      {
        title: "2026 新政亮点",
        items: [
          "精品作者保底最高 1000 元/千字",
          "全勤奖：日更 ≥4000 字 → 6 元/千字",
          "20 万字以上留存达标可提至 50 元/千字",
          "每月允许 1 天请假",
          "全版权 50% 分成（电子书、有声、短剧等）",
        ],
      },
      {
        title: "新人最低收入参考",
        items: [
          "保底：千字 30 元，月更 10 万字 → 3,000 元",
          "全勤：6 元/千字，月更 10 万字 → 600 元",
          "合计最低：3,600 元/月",
          "单月 502 位作者收入破万",
        ],
      },
    ],
  },
  feilu: {
    title: "飞卢小说",
    sections: [
      {
        title: "注册与发书",
        items: [
          "飞卢中文网（b.faloo.com）→ 作家专区 → 成为作者 → 实名认证",
          "新建作品：书名 ≤15 字，简介 300-800 字",
          "封面 800×1200px，≤2MB",
          "首章 ≥6000 字（约 3-4 章），设为公开立即发布",
          "必须联系编辑入库（QQ/企业微信），复制书号申请",
          "入库后首日建议更新至 2 万字，每章间隔 1-3 小时",
        ],
      },
      {
        title: "签约制度",
        items: [
          "1 万字即可后台主动提交签约申请，无需编辑邀请",
          "审核 1-3 天，通过率超 70%，只看爽点与节奏",
          "分成模式（主流）：作者 70%，平台 30%——行业最高之一",
          "签笔名不签人：换笔名即可去其他网站",
          "少量买断/保底（针对头部作者）",
        ],
      },
      {
        title: "全勤（2026 新规）",
        items: [
          "日更 4000 字 → 1000 元/月",
          "日更 8000 字 → 2000 元/月",
        ],
      },
      {
        title: "上架与推荐",
        items: [
          "上架字数：12 万字，需联系编辑手动设置",
          "日更 ≥6000 字才有上推荐资格",
          "断更需 7-9 天恢复权重",
          "原创文首日 300 V收可冲，同人 500 V收",
        ],
      },
      {
        title: "稿费结算",
        items: [
          "每月 20 号到账，需每月 2-12 号手动申请",
          "超过 800 元部分预扣 11.2%",
          "订阅满 200 元才可提现",
          "上架后月更新需 ≥4 万字，否则分成从 7:3 降至 5:5",
        ],
      },
    ],
  },
  qidian: {
    title: "起点中文网",
    sections: [
      {
        title: "注册与实名",
        items: [
          "起点官网 → 注册 → 作家专区 → 实名认证（1-5 分钟）",
          "未满 18 周岁不可签约，但可先创作积累",
          "笔名 2-12 字符，一经创建无法修改（修改需付费）",
          "港澳台/海外作者用护照/回乡证，审核 1-3 天",
        ],
      },
      {
        title: "发布规则",
        items: [
          "建议首次上传至少 3 章、共 1 万字以上",
          "每章建议 ≥2000 字",
          "首章必须是正文，不可用序章/楔子充数",
          "发布后 24 小时内完成新书申报，否则不计入新书榜",
          "书名/简介禁用词：转载、代写、AI 生成、复制粘贴",
        ],
      },
      {
        title: "签约路径",
        items: [
          "内投（推荐）：开头 6000 字 + 大纲 → 编辑邮箱",
          "直发：约 3 万字 + 追读量 → 后台出现申请入口",
          "内投编辑几小时至 2-3 天回复，直发 5-10 天",
          "不能一稿多投，被拒后再投另一位编辑",
          "不建议熬到 10 万字再申请",
        ],
      },
      {
        title: "全勤与收入",
        items: [
          "前 3 个月：日更 4000 字 → 1500 元/月",
          "第 4 个月起：日更 4000 字 + 均订 ≥500 → 1500 元/月",
          "500 均订预估月入 3000-4000 元",
          "5000 均订月入数万，万订月入 10 万+",
          "每月 12 号发稿费",
        ],
      },
      {
        title: "推荐机制",
        items: [
          "新书入库（约 2 万字）→ 试水推",
          "试水推荐共四轮，按追读数据 PK 晋级",
          "走完四轮 → 三江推荐",
          "未晋级 → 10 万字智能推（可能逆天改命）",
          "通常 20 万字左右上架",
        ],
      },
    ],
  },
};

export default function PlatformsPage() {
  const [active, setActive] = useState<Platform>("fanqie");
  const data = content[active];

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100">
      <nav className="border-b border-gray-800 px-4 sm:px-6 py-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/" className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent shrink-0">执笔惊鸿</Link>
        </div>
        <div className="flex items-center gap-3 sm:gap-4 overflow-x-auto whitespace-nowrap">
          <Link href="/help" className="text-xs text-gray-500 hover:text-white transition shrink-0">手册</Link>
          <Link href="/dashboard" className="text-sm text-gray-400 hover:text-white transition shrink-0">工作台</Link>
          <Link href="/login" className="text-sm text-gray-400 hover:text-white transition shrink-0">登录</Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-center mb-2">小说平台发布指南</h1>
        <p className="text-center text-gray-500 mb-8">了解各大平台的注册、签约、稿费规则，选择最适合你的战场</p>

        {/* Tab 切换 */}
        <div className="flex gap-2 mb-8 justify-center flex-wrap overflow-x-auto whitespace-nowrap px-2">
          {platforms.map((p) => (
            <button
              key={p.key}
              onClick={() => setActive(p.key)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition ${
                active === p.key
                  ? `bg-gradient-to-r ${p.color} text-white`
                  : "bg-gray-800 text-gray-400 hover:text-white"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* 内容 */}
        <div className="space-y-6">
          {data.sections.map((sec, i) => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
                <span className="w-1.5 h-5 rounded-full bg-purple-500 inline-block" />
                {sec.title}
              </h2>
              <ul className="space-y-2">
                {sec.items.map((item, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm text-gray-400">
                    <span className="text-purple-400 mt-0.5 shrink-0">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* 底部提示 */}
        <p className="text-center text-xs text-gray-600 mt-8">
          各平台规则可能随时调整，请以官方最新公告为准。
        </p>
      </div>
    </main>
  );
}
