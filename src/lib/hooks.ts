// 章中钩子检测

interface HookMatch {
  type: string;
  text: string;
  line: number;
  desc: string;
}

const HOOK_PATTERNS: [RegExp, string, string][] = [
  [/(就在这时|突然|猛然|忽然|没想到|谁也没想到|出乎意料)/g, "悬念转折", "突然性转折词，制造紧迫感"],
  [/(什么|怎么会|不可能|你说什么|真的假的|你再说一遍)/g, "对话钩子", "震惊/疑问类对话，引发读者好奇"],
  [/(".*?"[\s]*$|".*?"[\s]*$|「.*?」[\s]*$)/gm, "对话结尾", "章节以对话结尾，留下余韵"],
  [/(他死了|她走了|结束了|完了|出事了|出大事了|来不及了)/g, "情绪钩子", "短促情绪句，制造冲击"],
  [/(难道|莫非|莫不是|该不会)/g, "悬念疑问", "反问式悬念，暗示将发生重大事件"],
  [/(发现了一个秘密|发现了一个惊天秘密|原来如此|真相是)/g, "揭秘暗示", "暗示即将揭秘，吊读者胃口"],
  [/(露出了.*微笑|嘴角.*上扬|眼神.*变|脸色.*变|冷笑|狞笑)/g, "表情钩子", "角色表情变化暗示剧情转折"],
  [/(敲门声|脚步声|电话响了|门开了|门被推开)/g, "事件触发", "外界事件打断现状，制造新冲突"],
  [/(第\d+天|三天后|一个月后|半年后|第二天早上)/g, "时间跳跃", "时间快进，暗示新阶段开始"],
];

// 检测章节末尾是否为钩子
function checkChapterEnd(lines: string[]): HookMatch | null {
  if (lines.length < 3) return null;
  // Look at last 3 non-empty lines
  const nonEmpty = lines.filter(l => l.trim()).slice(-3);
  const lastLine = nonEmpty[nonEmpty.length - 1]?.trim() || "";
  const secondLast = nonEmpty[nonEmpty.length - 2]?.trim() || "";

  // Check for cliffhanger patterns in last lines
  const cliffPatterns = [
    /[，,]$/,       // ends with comma (cut off mid-sentence)
    /[……]{2,}$/,    // ends with ellipsis
    /[！!]$/,        // ends with exclamation
    /[？?]$/,        // ends with question
    /[—\-]{2,}$/,   // ends with dash
    /道$/,           // ends with "道" (someone said, cut off)
  ];
  for (const p of cliffPatterns) {
    if (p.test(lastLine) || p.test(secondLast)) {
      return { type: "章末悬念", text: (secondLast + lastLine).slice(-40), line: lines.length, desc: "章节结尾使用开放式结尾，制造追读欲" };
    }
  }
  return null;
}

export function detectHooks(content: string): { hooks: HookMatch[]; score: number; totalHooks: number } {
  if (!content) return { hooks: [], score: 0, totalHooks: 0 };

  const lines = content.split("\n");
  const hooks: HookMatch[] = [];

  // Scan each line for patterns
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const [regex, type, desc] of HOOK_PATTERNS) {
      const matches = line.match(regex);
      if (matches) {
        for (const m of matches) {
          hooks.push({ type, text: m, line: i + 1, desc });
        }
      }
    }
  }

  // Check chapter end
  const endHook = checkChapterEnd(lines);
  if (endHook) hooks.push(endHook);

  const totalHooks = hooks.length;
  const wordCount = content.replace(/\s/g, "").length;
  // Score: 每500字至少1个钩子为合格
  const expected = Math.max(1, wordCount / 500);
  const score = Math.min(100, Math.round((totalHooks / expected) * 100));

  return { hooks, score, totalHooks };
}
