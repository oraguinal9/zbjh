// 统一额度中台 - 配置（套餐 / 会员层级 / 各项目每日免费额度）

// 字数充值套餐（执笔惊鸿）
export const PACKAGES = {
  first: { amount: 9.9, words: 1_000_000, label: "首充特惠" },
  renew: { amount: 19.9, words: 1_000_000, label: "续费充值" },
} as const;
export type PackageType = keyof typeof PACKAGES;

// 会员层级（跨项目通用，开通后全站免费额度）
export const TIERS = {
  monthly: { days: 30, label: "月卡" },
  quarterly: { days: 90, label: "季卡" },
  annual: { days: 365, label: "年卡" },
  lifetime: { days: null, label: "终身卡" },
} as const;
export type TierKey = keyof typeof TIERS;

// 各项目每日免费调用次数；未配置的项目走 default
export const PROJECTS = {
  zbjh: { dailyFree: { user: 100, anon: 3 } },
  default: { dailyFree: { user: 30, anon: 3 } },
} as const;

// 会员每日免费额度上限（实际由 isMember 提前放行，不进入每日计数）
export const MEMBER_UNLIMITED_DAILY = 99999;
