// 统一额度中台 - 类型定义

import type { TierKey } from "./config";

export type QuotaResult = {
  paidUserId: string | null;
  errorResponse?: Response;
  isMember?: boolean;
};

export type Membership = {
  tier: TierKey;
  expiresAt: string | null; // lifetime 会员为 null
};
