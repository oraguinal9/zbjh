// ===== 网文题材模板库 =====
// 用于大纲生成和续写时注入题材特定的设定参考

export interface GenreTemplate {
  id: string
  name: string
  /** 世界观框架提示 */
  worldBuilding: string
  /** 常见势力/阵营模板 */
  factions: string[]
  /** 力量体系/核心规则 */
  powerSystem: string[]
  /** 主角常见人设标签 */
  protagonistTags: string[]
  /** 经典开篇套路 */
  openers: string[]
  /** 核心爽点类型 */
  pleasurePoints: string[]
  /** 节奏建议 */
  pacingTips: string
  /** 禁忌/避坑 */
  avoid: string[]
}

const templates: Record<string, GenreTemplate> = {
  xuanhuan: {
    id: "xuanhuan",
    name: "玄幻",
    worldBuilding: "异世界大陆，多种族多文明并存。修炼体系为主流力量规则，宗门/帝国/家族三大势力格局。天地灵气为资源核心，强者为尊。",
    factions: ["宗门（正道/魔道/中立）", "帝国王朝", "古老家族", "神秘组织", "异族/妖族", "散修联盟"],
    powerSystem: ["修炼境界（练气→筑基→金丹→元婴→化神→...）", "功法（天/地/玄/黄阶）", "灵根/体质天赋", "丹药/法宝/阵法", "血脉传承"],
    protagonistTags: ["废材逆袭", "重生者", "穿越者", "身怀异宝", "特殊体质", "复仇者", "天才陨落重来"],
    openers: ["主角是宗门废柴外门弟子，被退婚/羞辱后觉醒金手指", "前世天帝/至尊陨落后重生回少年时代", "现代人穿越到修真世界，用现代知识降维打击", "平凡少年意外获得上古传承，从此踏上修仙路"],
    pleasurePoints: ["境界突破碾压对手", "扮猪吃老虎打脸", "获得稀有法宝/丹药", "收服强大妖兽/手下", "秘境夺宝独占鳌头", "越级战斗反杀"],
    pacingTips: "前10章完成金手指觉醒+第一次打脸；每30章一个大境界突破；每10章一个小高潮；每隔5章有一个小爽点。",
    avoid: ["不要前30章还在筑基期", "金手指不要一次性给太多设定", "配角不要出场即工具人", "不要大段描写修炼过程"],
  },
  dushi: {
    id: "dushi",
    name: "都市",
    worldBuilding: "现代都市背景，可加入隐秘世家/古武/异能等暗线。表面是普通都市，暗处有另一套力量体系。",
    factions: ["商业集团", "隐秘世家", "古武门派", "异能组织", "政府部门", "地下势力"],
    powerSystem: ["医术/古武传承", "异能觉醒", "商业头脑/预知", "系统金手指", "前世记忆"],
    protagonistTags: ["退役兵王", "重生回到过去", "神医传人", "鉴宝大师", "超级保镖", "隐藏身份的大佬"],
    openers: ["主角是退役兵王/神医传人，低调回归都市，偶遇女主卷入纠纷", "重生回到关键时间点，利用未来记忆改变命运", "普通青年意外获得传承/系统，人生开挂", "隐世高手入世历练，扮猪吃虎"],
    pleasurePoints: ["医术惊人治好绝症", "商场博弈碾压对手", "身份揭露全场震惊", "武力碾压挑衅者", "美人倾心"],
    pacingTips: "前5章建立主角能力+第一个冲突；每15章一个中型事件；每3-5章一个小爽点。注意都市题材不要拖节奏。",
    avoid: ["不要大量描写修炼过程", "不要脱离都市感变成纯玄幻", "女主不要超过3个（容易违规）", "不要过于黑暗或涉及敏感社会话题"],
  },
  yanqing: {
    id: "yanqing",
    name: "言情",
    worldBuilding: "现代都市/校园/古风背景，以人物关系和情感发展为核心推动力。",
    factions: ["主角家庭", "对手/情敌", "闺蜜/兄弟团", "职场/学校环境"],
    powerSystem: [],
    protagonistTags: ["独立坚强女主", "高冷男主", "双向暗恋", "破镜重圆", "先婚后爱", "欢喜冤家"],
    openers: ["女主重生回到过去，决心改变命运不再被渣男欺骗", "身份错位：替姐/妹相亲，遇到真命天子", "职场冤家：第一天上班发现上司是前男友", "契约恋爱：假扮情侣假戏真做"],
    pleasurePoints: ["双向暗恋的甜蜜互动", "误会解开时的情感爆发", "男主默默付出的感人细节", "女主成长独立的爽感", "反派被打脸的痛快"],
    pacingTips: "前5章建立男女主相遇+首次互动；每10章一个情感转折；全书3-5个核心情感节点（初遇→暧昧→矛盾→高潮→结局）。",
    avoid: ["不要强行虐主为虐而虐", "不要女配降智陷害", "不要男主过于完美无缺点", "不要涉及未成年恋爱（违规风险）"],
  },
  xianxia: {
    id: "xianxia",
    name: "仙侠",
    worldBuilding: "修仙世界，以飞升成仙为目标。有明确的修炼境界、天劫、因果轮回体系。仙界/凡界/魔界三层世界架构。",
    factions: ["修仙宗门（剑修/符修/体修等）", "魔道宗门", "妖族", "天庭/仙界势力", "散修", "古老遗迹守护者"],
    powerSystem: ["修炼境界（炼气→筑基→金丹→元婴→化神→渡劫→大乘→飞升）", "法宝（法器→灵宝→仙器→神器）", "功法/神通", "丹药/灵草", "阵法/符箓"],
    protagonistTags: ["重生渡劫失败重修", "凡体逆天改命", "剑修天才", "丹道/阵法天才", "身怀重宝"],
    openers: ["渡劫失败的重生者回到少年时代，抢占先机", "山村少年意外获得仙人传承", "被宗门抛弃的废灵根弟子发现体质秘密", "穿越成修仙界的凡人，靠智慧逆袭"],
    pleasurePoints: ["渡劫成功实力飞跃", "越级斩杀强敌", "获得上古传承", "收服稀有灵兽", "炼丹/炼器成功震惊全宗", "秘境探险独占鳌头"],
    pacingTips: "前20章完成入门+第一次奇遇；每20章一个小境界突破；每50章一个大境界；每8章一个小爽点。仙侠节奏比玄幻稍慢。",
    avoid: ["不要前期就出现仙界高端战力", "修炼体系不要频繁吃书改设定", "不要大段引用道家经典充字数", "女角色不要只当花瓶"],
  },
  kehuan: {
    id: "kehuan",
    name: "科幻",
    worldBuilding: "未来世界/星际文明/末世废土/赛博朋克。科技为核心驱动力，可以有人工智能/基因改造/星际航行等元素。",
    factions: ["星际帝国/联邦", "大型企业/财团", "反抗军/盗匪", "外星文明", "AI/机器人组织", "地下黑市"],
    powerSystem: ["基因改造等级", "机甲/外骨骼", "精神念力/异能", "纳米技术", "AI辅助系统"],
    protagonistTags: ["星际退伍军人", "基因改造实验体", "穿越到未来", "AI觉醒者", "末世幸存者", "星际矿工逆袭"],
    openers: ["退伍军人在边缘星系卷入星际阴谋", "科学家意外穿越到末世废土", "底层少年获得上古文明传承", "AI觉醒后带领人类对抗外星入侵"],
    pleasurePoints: ["获得更高级机甲/战舰", "以弱胜强的星际战役", "科技突破震惊世界", "揭露惊天阴谋", "收服外星势力"],
    pacingTips: "前10章建立世界观+主角金手指；每15章一个星际事件；保持科技感但不要堆砌术语。",
    avoid: ["不要用伪科学硬解释奇幻设定", "科技设定要保持基本逻辑", "不要写成披着科幻皮的玄幻", "AI设定不要过于万能"],
  },
  lishi: {
    id: "lishi",
    name: "历史",
    worldBuilding: "特定历史时期（穿越/重生），遵守大历史框架，在细节处发挥。古代政治/军事/文化体系完整。",
    factions: ["皇室/朝廷", "文官集团", "武将集团", "地方势力", "外敌/异族", "民间组织"],
    powerSystem: [],
    protagonistTags: ["穿越者用现代知识", "重生改变历史遗憾", "历史专家", "商人/工匠/官员"],
    openers: ["现代人穿越到古代，用现代知识崭露头角", "重生回到历史关键节点，改变家族/国家命运", "穿越成底层小人物，步步为营往上爬", "历史教授穿越回研究的朝代"],
    pleasurePoints: ["现代知识碾压古代", "步步高升位极人臣", "改变历史悲剧的成就感", "文化/军事改革成功", "收服历史名人"],
    pacingTips: "前10章确立主角立足+展示核心金手指；每20章一个历史事件节点；尊重大历史走向，改变细节。",
    avoid: ["不要过度美化历史人物", "不要篡改重大历史事件结果（违规风险）", "不要贬低民族英雄", "历史文化细节要考证准确"],
  },
  kongbu: {
    id: "kongbu",
    name: "恐怖/悬疑",
    worldBuilding: "现代都市/诡异空间/无限流副本。以悬疑解谜和恐怖氛围为核心。",
    factions: ["调查团队", "幕后黑手/组织", "超自然存在", "警方/官方机构", "幸存者群体"],
    powerSystem: ["特殊体质/灵视", "驱鬼/除魔能力", "推理/洞察力", "系统赋予的技能"],
    protagonistTags: ["灵异体质者", "退役刑警", "民间道士/传人", "无限流玩家", "记者/调查员"],
    openers: ["主角是能看见鬼魂的普通人，被迫卷入灵异事件", "收到一封神秘邀请函，进入诡异空间", "新租的房子闹鬼，开始调查背后的真相", "刑警接手一桩离奇命案，越查越诡异"],
    pleasurePoints: ["真相揭露的震撼", "破解不可能犯罪", "逃出生天的紧张刺激", "反杀幕后黑手", "队友从怀疑到信任"],
    pacingTips: "前3章必须出现第一个诡异事件；每5章一个小案件/副本；全书贯穿一条主线谜团。保持悬念不泄底。",
    avoid: ["不要最后用精神病解释一切", "不要过度血腥暴力（审核风险）", "不要涉及真实敏感事件", "灵异要有合理解释体系"],
  },
  wuxia: {
    id: "wuxia",
    name: "武侠",
    worldBuilding: "古代江湖世界，有明确的武林门派、武功体系。家国情怀与个人恩怨交织。",
    factions: ["武林门派（少林/武当/峨眉等）", "魔教/邪派", "朝廷/六扇门", "江湖散人/隐士", "镖局/商帮"],
    powerSystem: ["内功境界", "外功招式", "轻功/身法", "暗器/毒术", "兵器刀剑"],
    protagonistTags: ["少年复仇", "隐世高人传人", "江湖浪子", "朝廷密探", "武学天才"],
    openers: ["少年目睹满门被灭，带着秘籍逃出", "隐居山野的少年意外卷入江湖纷争", "神偷/骗子被迫加入正义阵营", "失忆高手流落小镇"],
    pleasurePoints: ["习得绝世武功", "报仇雪恨的快意恩仇", "武林大会技压群雄", "结识红颜知己", "拯救武林于危难"],
    pacingTips: "前10章建立仇怨/目标+获得第一项能力；每15章一个江湖事件；保持江湖气息和侠义精神。",
    avoid: ["不要内力无限膨胀变成玄幻", "朝代背景不要混淆", "武功体系保持逻辑连贯", "江湖规矩不要随意打破"],
  },
  nongye: {
    id: "nongye",
    name: "种田/农业",
    worldBuilding: "古代乡村/末世领地/异世界开拓。以发展建设为核心，节奏舒缓，成就感来自积累和成长。",
    factions: ["家族/宗族", "地方政府", "商会", "邻里乡亲", "竞争对手"],
    powerSystem: [],
    protagonistTags: ["穿越成农家女/子", "重生回到改革前", "末世领地领主", "古代技术专家"],
    openers: ["穿越成古代农家女，带着现代知识发家致富", "重生回到80年代，抓住改革开放的浪潮", "末世觉醒领地系统，从零建设安全基地", "穿成古代地主家不受宠的庶子，分家后开始种田"],
    pleasurePoints: ["发明/改良技术大获成功", "生意越做越大", "带领大家致富的成就感", "打脸看不起自己的人", "家庭和睦幸福美满"],
    pacingTips: "前10章建立基础生存能力；每10章一个技术/商业突破；种田文注重细节和过程，不要跳跃过快。",
    avoid: ["不要金手指过于逆天", "不要忽视古代/末世的基本生存逻辑", "人际关系不要太现代", "技术发展要符合时代背景循序渐进"],
  },
  youling: {
    id: "youling",
    name: "游戏/网游",
    worldBuilding: "虚拟现实游戏世界/游戏穿越。有明确的等级、职业、技能、副本体系。",
    factions: ["玩家公会", "游戏公司", "职业玩家团队", "游戏内NPC势力", "敌对公会"],
    powerSystem: ["职业体系（战士/法师/刺客/牧师等）", "等级/装备/技能", "隐藏职业/任务", "副本/PVP排名"],
    protagonistTags: ["职业选手退役", "内测玩家/先知", "游戏天才", "休闲玩家逆袭", "游戏设计师"],
    openers: ["职业选手退役后进入新游戏，重新登顶", "获得游戏内测资格，抢占先机", "普通玩家意外获得隐藏职业", "穿越到游戏世界，拥有现实世界知识"],
    pleasurePoints: ["首杀BOSS的荣耀", "PK碾压高手", "获得稀有装备/技能", "公会战/国战胜利", "隐藏身份揭露的震惊"],
    pacingTips: "前5章建立角色+首次副本；每10章一个大副本/事件；保持游戏感和升级爽感。",
    avoid: ["不要长时间写现实世界", "游戏设定不要过于复杂", "不要依赖随机/概率描写水字数", "竞技比赛要写清楚策略和看点"],
  },
}

export function getGenreTemplate(genre: string): GenreTemplate | null {
  // 按中文名或英文ID匹配
  const normalizedGenre = genre.toLowerCase().trim()
  for (const [key, tmpl] of Object.entries(templates)) {
    if (key === normalizedGenre || tmpl.name === genre) return tmpl
  }
  // 模糊匹配
  for (const [, tmpl] of Object.entries(templates)) {
    if (tmpl.name.includes(genre) || genre.includes(tmpl.name)) return tmpl
  }
  return null
}

export function buildGenreContext(genre: string): string {
  const tmpl = getGenreTemplate(genre)
  if (!tmpl) return ""

  return `【${tmpl.name}题材创作参考】

世界观框架：${tmpl.worldBuilding}

常见势力/阵营：
${tmpl.factions.map(f => `- ${f}`).join("\n")}

${tmpl.powerSystem.length ? `力量体系参考：\n${tmpl.powerSystem.map(p => `- ${p}`).join("\n")}\n` : ""}

经典开篇套路：
${tmpl.openers.map(o => `- ${o}`).join("\n")}

核心爽点类型：
${tmpl.pleasurePoints.map(p => `- ${p}`).join("\n")}

节奏建议：${tmpl.pacingTips}

避坑指南：
${tmpl.avoid.map(a => `- ${a}`).join("\n")}`
}

export function buildOutlineSystemPrompt(genre: string, wordCount: number): string {
  const tmpl = getGenreTemplate(genre)
  let prompt = `你是番茄小说平台的资深大纲策划师，专精${tmpl?.name || genre}爆款网文结构。`

  if (tmpl) {
    prompt += `

【${tmpl.name}题材核心规则】
世界观：${tmpl.worldBuilding}
主角常用人设：${tmpl.protagonistTags.join("、")}
核心爽点：${tmpl.pleasurePoints.join("、")}
节奏铁律：${tmpl.pacingTips}
避坑：${tmpl.avoid.join("；")}`
  }

  prompt += `

目标：为一部${wordCount}万字的${genre}长篇小说生成完整大纲。`

  return prompt
}

export function buildWritingSystemPrompt(genre: string): string {
  const tmpl = getGenreTemplate(genre)
  if (!tmpl) return ""

  return `
【${tmpl.name}题材写作提示】
世界观框架：${tmpl.worldBuilding}
核心爽点：${tmpl.pleasurePoints.join("、")}
节奏建议：${tmpl.pacingTips}
避坑：${tmpl.avoid.join("；")}`
}

export default templates
