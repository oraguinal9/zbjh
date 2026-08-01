
-- ============ 追加: RLS 策略（原脚本缺失，anon 读写必需） ============
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.world_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invite_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_records ENABLE ROW LEVEL SECURITY;

-- users: 本人可读写
CREATE POLICY "users_select_own" ON public.users FOR SELECT USING (id = auth.uid());
CREATE POLICY "users_insert_own" ON public.users FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "users_update_own" ON public.users FOR UPDATE USING (id = auth.uid());

-- profiles: 本人可读写（邀请码绑定逻辑在服务端）
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (id = auth.uid());

-- projects: 本人 CRUD
CREATE POLICY "projects_select_own" ON public.projects FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "projects_insert_own" ON public.projects FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "projects_update_own" ON public.projects FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "projects_delete_own" ON public.projects FOR DELETE USING (user_id = auth.uid());

-- volumes: 服务端按 project_id 隔离，登录用户即可访问（实际由 API 校验归属）
CREATE POLICY "volumes_all_auth" ON public.volumes FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- chapters: 同上
CREATE POLICY "chapters_all_auth" ON public.chapters FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- ai_history: 同上
CREATE POLICY "ai_history_all_auth" ON public.ai_history FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- characters: 同上
CREATE POLICY "characters_all_auth" ON public.characters FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- world_settings: 同上
CREATE POLICY "world_settings_all_auth" ON public.world_settings FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- user_balances: 本人读写
CREATE POLICY "balances_select_own" ON public.user_balances FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "balances_insert_own" ON public.user_balances FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "balances_update_own" ON public.user_balances FOR UPDATE USING (user_id = auth.uid());

-- orders: 本人读写
CREATE POLICY "orders_all_own" ON public.orders FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- invite_rewards: 本人读写
CREATE POLICY "invite_rewards_all_own" ON public.invite_rewards FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- usage_records: 本人读写
CREATE POLICY "usage_records_all_own" ON public.usage_records FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============ 触发器: 注册后自动建 users/profile/balance ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email) VALUES (NEW.id, NEW.email) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.profiles (id, invite_code)
  VALUES (NEW.id, upper(substr(md5(NEW.id::text || NEW.email), 1, 6)))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_balances (user_id, remaining_words, total_purchased_words)
  VALUES (NEW.id, 0, 0) ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
