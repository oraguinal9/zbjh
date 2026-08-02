# 统一额度中台（quota-center）接入指南

目标：让所有子项目（执笔惊鸿 / 灵犀解梦 / 修仙大师姐 / 漫剧助手 / comic / xiaoling …）
共用**同一套登录、会员、额度**，用户在一个项目开通会员，全站通用。

## 1. 前置条件
- 所有子项目使用**同一个中央 Supabase 项目**（auth.users 共享）。
- 在该项目 SQL Editor 执行 `scripts/quota-center.sql`（建表 + RPC + 宽松 RLS）。
- 各子项目环境变量指向该中央项目：
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 2. 在子项目中接入
把 `src/lib/quota-center/` 整个目录复制到子项目 `src/lib/` 下，然后在 API 路由里：

```ts
import { checkQuotaOrError, isMember } from "@/lib/quota-center";

export async function POST(req: NextRequest) {
  // project 用本项目标识，如 "comic" / "xiaoling"
  const { paidUserId, errorResponse } = await checkQuotaOrError(req, "comic");
  if (errorResponse) return errorResponse;
  // ... 执行业务，需要扣费时：paidUserId 非空才扣费
}
```

免费/会员判定优先级（已在中心实现）：
1. **会员** → 免费放行（不扣额度）
2. **已购余额** → 扣费放行
3. **每日免费次数** → DB 原子计数，超限返回 402/429
4. 未登录匿名 → 按 IP 限免费次数，超限引导登录

## 3. 自定义每日免费额度
在 `config.ts` 的 `PROJECTS` 中为本项目加一项即可：

```ts
export const PROJECTS = {
  zbjh: { dailyFree: { user: 100, anon: 3 } },
  comic: { dailyFree: { user: 50, anon: 3 } },
  default: { dailyFree: { user: 30, anon: 3 } },
};
```

## 4. 售卖会员（在支付回调里）
```ts
import { grantMembership } from "@/lib/quota-center";
// 支付成功后
await grantMembership(userId, "monthly"); // 或 quarterly / annual / lifetime
```

## 5. 已有进度
- [x] 执笔惊鸿已通过 `src/lib/billing.ts` 兼容层接入 quota-center（路由无需改动）
- [x] 每日免费次数从文件版（`rate-limit.ts`，仅写本地文件、且路由从不调用 check 故免费限制从未生效）改为 DB 原子版；原 `rate-limit.ts` 已删除，9 个 AI 路由的 `incrementCount` 调用已移除，配额统一由 `checkQuotaOrError` 内部的 `check_and_incr_daily(p_limit)` 完成
- [ ] 其他子项目复制 quota-center 并指向中央 Supabase（下一步）
- [ ] AI造物加支付/会员收银台（见落地优先级 ②）
