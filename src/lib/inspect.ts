// 章节本地红线扫描：AI味高频词 / 破折号 / 句式问题 / 重复词
// 规则与 webnovel-humanize、webnovel-check 技能对齐，本地秒级返回，不消耗额度。

export interface FlavorHit {
  word: string;
  category: string;
  count: number;
}

export interface PatternIssue {
  name: string;
  count: number;
  sample: string;
  suggestion: string;
}

export interface RepeatHit {
  word: string;
  count: number;
}

export interface InspectIssue {
  severity: "high" | "medium" | "low";
  label: string;
  detail: string;
  suggestion: string;
}

export interface InspectReport {
  score: number;
  wordCount: number;
  dashCount: number;
  ellipsisCount: number;
  flavorHits: FlavorHit[];
  patternIssues: PatternIssue[];
  topRepeated: RepeatHit[];
  issues: InspectIssue[];
}

const FLAVOR_WORDS: [string, string][] = [
  ["仿佛", "虚词"], ["似乎", "虚词"], ["宛如", "虚词"], ["犹如", "虚词"], ["好像", "虚词"],
  ["忽然", "时间副词"], ["骤然", "时间副词"], ["猛地", "时间副词"], ["瞬间", "时间副词"],
  ["刹那间", "时间副词"], ["陡然", "时间副词"], ["这一刻", "时间副词"], ["那一瞬间", "时间副词"],
  ["然而", "转折连词"],
  ["心中五味杂陈", "空泛抒情"], ["内心深处", "空泛抒情"], ["眼神深邃", "空泛抒情"], ["天地都安静了", "空泛抒情"],
  ["这意味着", "总结概括"], ["换句话说", "总结概括"], ["值得注意的是", "总结概括"],
  ["眼神一凝", "表情套话"], ["嘴角勾起", "表情套话"], ["眼中闪过一丝", "表情套话"], ["眸光一闪", "表情套话"],
  ["心里一暖", "情绪直给"], ["激动万分", "情绪直给"], ["感动不已", "情绪直给"], ["心头一紧", "情绪直给"],
];

const PATTERNS: [RegExp, string, string][] = [
  [/不是[^。！？\n]{2,30}而是/g, "“不是…而是…”绕圈句式", "书面总结腔，改成直接给结果"],
  [/(愤怒|冷冷|淡淡|平静|严肃|激动|轻声|沉声)地说/g, "“X地说”式副词", "用动作/反应替代，别替读者念情绪"],
  [/既[^，。！？\n]{1,14}又[^，。！？\n]{1,14}/g, "“既…又…”对称句式", "拆成错落短句，避免排比腔"],
];

const STOPWORDS = new Set([
  "一个", "什么", "没有", "自己", "他们", "我们", "你们", "她们", "这个", "那个",
  "这么", "那么", "已经", "还是", "知道", "看到", "时候", "现在", "但是", "因为",
  "所以", "如果", "虽然", "只是", "不过", "然后", "觉得", "起来", "出来", "下来",
  "过去", "回来", "开始", "发现", "看见", "声音", "眼前", "心里", "感觉", "一样",
  "忽然", "仿佛", "似乎", "真的", "有点", "有些", "一下", "一边", "于是", "而且",
  "甚至", "还有", "就是", "不是", "可是", "可以", "不能", "不会", "这么", "那样",
  "这里", "那里", "身上", "手上", "脚下", "脸上", "眼里", "屋里", "门外", "村里",
  "山上", "时间", "地方", "东西", "事情", "面前", "身后", "旁边", "周围", "最后",
  "终于", "原来", "其实", "大概", "也许", "可能", "应该", "必须", "一定", "一起",
  "一直", "一般", "一点", "一些", "不多", "不少", "十分", "非常", "特别", "更加",
  "越来越", "渐渐", "慢慢", "轻轻", "缓缓", "微微", "暗暗", "冷冷", "静静", "淡淡",
  "死死", "紧紧", "深深", "重重", "狠狠", "纷纷", "连忙", "赶紧", "急忙", "立刻",
  "马上", "顿时", "随即", "随后", "接着", "跟着", "之后", "以前", "以后", "原本",
  "当初", "曾经", "后来", "如今", "此刻", "此时", "这时", "那时", "当晚", "次日",
  "第二天", "第三", "第四", "第五", "第六", "第七", "第八", "第九", "第十",
]);

export function inspectLocal(content: string): InspectReport {
  const clean = content.replace(/\s/g, "");
  const wordCount = clean.length;

  // 破折号 / 省略号
  const dashCount = (content.match(/—{2,}/g) || []).length;
  const ellipsisCount = (content.match(/…{2,}/g) || []).length;

  // AI 高频词
  const flavorHits: FlavorHit[] = [];
  for (const [word, category] of FLAVOR_WORDS) {
    const count = content.split(word).length - 1;
    if (count > 0) flavorHits.push({ word, category, count });
  }
  flavorHits.sort((a, b) => b.count - a.count);

  // 句式问题
  const patternIssues: PatternIssue[] = [];
  for (const [regex, name, suggestion] of PATTERNS) {
    const matches = content.match(regex) || [];
    if (matches.length) {
      patternIssues.push({ name, count: matches.length, sample: (matches[0] || "").slice(0, 24), suggestion });
    }
  }

  // 重复词（2 字词频，过滤停用词）
  const freq = new Map<string, number>();
  for (let i = 0; i < clean.length - 1; i++) {
    const w = clean.slice(i, i + 2);
    if (STOPWORDS.has(w)) continue;
    freq.set(w, (freq.get(w) || 0) + 1);
  }
  const topRepeated: RepeatHit[] = [...freq.entries()]
    .filter(([, c]) => c >= 4)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word, count]) => ({ word, count }));

  const issues: InspectIssue[] = [];

  if (wordCount < 2000) {
    issues.push({
      severity: "medium",
      label: "字数不足",
      detail: `当前${wordCount}字，番茄男频建议 2000–2500 字。`,
      suggestion: "用“📏 补字数”续到目标，或先补内容再体检。",
    });
  }
  if (dashCount > 10) {
    issues.push({
      severity: "high",
      label: "破折号泛滥",
      detail: `本章 ${dashCount} 处破折号，AI 味重灾区。`,
      suggestion: "删到 5 处以内；破折号留给最想强调的那一句。",
    });
  } else if (dashCount > 5) {
    issues.push({
      severity: "medium",
      label: "破折号偏多",
      detail: `本章 ${dashCount} 处破折号（红线 ≤5）。`,
      suggestion: "优先删掉可换成逗号/句号的破折号。",
    });
  }
  if (ellipsisCount > 3) {
    issues.push({
      severity: "medium",
      label: "省略号滥用",
      detail: `本章 ${ellipsisCount} 处省略号（红线 ≤3）。`,
      suggestion: "省略号留给欲言又止的对话，其余删掉。",
    });
  }

  const totalFlavor = flavorHits.reduce((s, h) => s + h.count, 0);
  if (totalFlavor >= 10) {
    issues.push({
      severity: "high",
      label: "AI 高频词偏多",
      detail: `共命中 ${totalFlavor} 处（仿佛/然而/这一刻等）。`,
      suggestion: "逐处换成具体动作或删掉；重复超过 3 次的词优先处理。",
    });
  } else if (totalFlavor >= 5) {
    issues.push({
      severity: "medium",
      label: "有 AI 腔词汇",
      detail: `共命中 ${totalFlavor} 处 AI 高频词。`,
      suggestion: "见下方命中列表，逐词替换。",
    });
  }

  for (const p of patternIssues) {
    issues.push({
      severity: p.count >= 3 ? "high" : "medium",
      label: p.name,
      detail: `${p.count} 处，例如“${p.sample}”`,
      suggestion: p.suggestion,
    });
  }

  for (const r of topRepeated.slice(0, 5)) {
    if (r.count >= 8) {
      issues.push({
        severity: "medium",
        label: `重复词“${r.word}”`,
        detail: `出现 ${r.count} 次。`,
        suggestion: "用近义表达替换一半以上，别让读者看出复读机。",
      });
    }
  }

  // 评分
  let score = 100;
  if (wordCount < 2000) score -= 5;
  if (dashCount > 5) score -= Math.min(10, (dashCount - 5) * 2);
  if (ellipsisCount > 3) score -= 5;
  score -= Math.min(20, totalFlavor * 2);
  score -= Math.min(15, patternIssues.reduce((s, p) => s + p.count, 0) * 3);
  score -= Math.min(10, topRepeated.filter((r) => r.count >= 8).length * 3);
  score = Math.max(0, Math.min(100, score));

  return { score, wordCount, dashCount, ellipsisCount, flavorHits, patternIssues, topRepeated, issues };
}
