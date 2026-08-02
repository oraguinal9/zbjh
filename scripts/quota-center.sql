-- 统一额度中台 数据库架构
-- 在【中央 Supabase 项目】的 SQL Editor 中执行一次（所有子项目共用同一项目）
-- 最后更新: 2026-08-02

-- 每日免费额度（替代原文件版 rate-limit，跨项目共享、Serverless 安全）
CREATE TABLE IF NOT EXISTS daily_quota (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,           -- 登录用户: user_id；匿名: anon:<ip>
  project text NOT NULL,           -- zbjh / comic / xiaoling ...
  qdate date NOT NULL,
  count int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_daily_quota ON daily_quota(subject, project, qdate);

-- 会员（跨项目通用）
CREATE TABLE IF NOT EXISTS memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  tier text NOT NULL,              -- monthly / quarterly / annual / lifetime
  started_at timestamptz DEFAULT now(),
  expires_at timestamptz,          -- lifetime 为 NULL
  created_at timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_membership_user ON memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_user ON memberships(user_id);

-- 统一流水账（跨项目消费/充值记录，供数据分析面板使用）
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  project text NOT NULL DEFAULT 'zhbj',
  type text NOT NULL,              -- purchase / consume / reward
  amount int NOT NULL DEFAULT 0,   -- 字数或积分
  note text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tx_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_tx_project ON transactions(project);

-- 原子“检查 + 累加”当日免费次数（避免并发超发）
CREATE OR REPLACE FUNCTION check_and_incr_daily(
  p_subject text, p_project text, p_date date, p_limit int
) RETURNS jsonb AS $$
DECLARE
  cur int;
  remaining int;
BEGIN
  SELECT count INTO cur FROM daily_quota WHERE subject = p_subject AND project = p_project AND qdate = p_date;
  IF cur IS NULL THEN
    INSERT INTO daily_quota(subject, project, qdate, count) VALUES (p_subject, p_project, p_date, 1);
    RETURN jsonb_build_object('allowed', true, 'remaining', p_limit - 1);
  END IF;
  IF cur >= p_limit THEN
    RETURN jsonb_build_object('allowed', false, 'remaining', 0);
  END IF;
  UPDATE daily_quota SET count = cur + 1 WHERE subject = p_subject AND project = p_project AND qdate = p_date;
  remaining := p_limit - cur - 1;
  RETURN jsonb_build_object('allowed', true, 'remaining', remaining);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 宽松 RLS（与现有项目一致；后续如需收紧可改为按 user_id 隔离）
ALTER TABLE daily_quota ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow all daily_quota" ON daily_quota FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow all memberships" ON memberships FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow all transactions" ON transactions FOR ALL USING (true) WITH CHECK (true);
