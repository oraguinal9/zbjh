-- AI写作平台 数据库架构
-- 在Supabase SQL Editor中执行
-- 最后更新: 2026-05-24 (同步代码实际使用字段)

-- 用户表（由Supabase Auth自动管理，此表为扩展）
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 用户扩展信息（邀请码系统）
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  invite_code TEXT UNIQUE NOT NULL,
  invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 作品表
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '未命名作品',
  genre TEXT DEFAULT '都市',
  summary TEXT DEFAULT '',
  outline TEXT DEFAULT '',              -- 完整大纲文本（总纲+分卷）
  style_sample TEXT DEFAULT '',          -- 文风样本（用于AI续写/润色/扩写的风格模仿）
  status TEXT DEFAULT 'draft',           -- draft / writing / completed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 卷表
CREATE TABLE volumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '第一卷',
  sort_order INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 章节表
CREATE TABLE chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  volume_id UUID REFERENCES volumes(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '未命名章节',
  content TEXT DEFAULT '',
  summary TEXT DEFAULT '',               -- AI生成的剧情摘要（续写时用于全局剧情记忆）
  word_count INT DEFAULT 0,              -- 自动计算的中文字数
  sort_order INT DEFAULT 1,
  ai_generated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI生成历史（用作历史版本管理）
CREATE TABLE ai_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE,
  prompt TEXT,
  generated_content TEXT,                -- AI生成的内容快照
  model_used TEXT DEFAULT 'deepseek',
  tokens_used INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 人物表
CREATE TABLE characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  avatar_prompt TEXT DEFAULT '',
  description TEXT DEFAULT '',
  traits JSONB DEFAULT '{}',
  relations JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 世界观表
CREATE TABLE world_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE UNIQUE,
  era TEXT DEFAULT '',
  power_system TEXT DEFAULT '',
  factions JSONB DEFAULT '[]',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 用户余额表
CREATE TABLE user_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  remaining_words INTEGER NOT NULL DEFAULT 0,       -- 剩余字数
  total_purchased_words INTEGER NOT NULL DEFAULT 0, -- 累计充值字数
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 订单表
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  order_no VARCHAR(64) NOT NULL UNIQUE,
  amount DECIMAL(10,2) NOT NULL,
  words INTEGER NOT NULL DEFAULT 0,
  package_type VARCHAR(20) NOT NULL DEFAULT 'first', -- first / renew
  status VARCHAR(20) NOT NULL DEFAULT 'pending',     -- pending / paid / expired / cancelled
  payment_method VARCHAR(20) DEFAULT 'alipay',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 邀请奖励记录表
CREATE TABLE invite_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  amount_words INTEGER NOT NULL DEFAULT 0,
  reason VARCHAR(50) NOT NULL,           -- signup_bonus / referral_bonus / recharge_bonus
  related_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI消费记录
CREATE TABLE usage_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  words_used INTEGER NOT NULL DEFAULT 0,
  feature VARCHAR(50) NOT NULL,          -- continue / expand / polish / outline / analyze / titles / characters / summarize
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  chapter_id UUID REFERENCES chapters(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_profiles_invite_code ON profiles(invite_code);
CREATE INDEX idx_profiles_invited_by ON profiles(invited_by);
CREATE INDEX idx_projects_user ON projects(user_id);
CREATE INDEX idx_volumes_project ON volumes(project_id);
CREATE INDEX idx_chapters_volume ON chapters(volume_id);
CREATE INDEX idx_ai_history_chapter ON ai_history(chapter_id);
CREATE INDEX idx_ai_history_user ON ai_history(user_id);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_order_no ON orders(order_no);
CREATE INDEX idx_invite_rewards_user ON invite_rewards(user_id);
CREATE INDEX idx_usage_user ON usage_records(user_id);
CREATE INDEX idx_usage_date ON usage_records(created_at);
