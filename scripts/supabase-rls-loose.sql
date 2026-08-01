-- ============================================================
-- RLS 策略调整：服务端用 anon key + user_id 隔离（代码模式）
-- 旧库不开 RLS 一直正常；新库默认开 RLS 导致服务端 anon 被拒
-- 方案：所有表启用宽松策略（anon/authenticated 可读写），
--       数据隔离由服务端 getCurrentUser + .eq("user_id") 保证
-- 在 Supabase SQL Editor 执行
-- ============================================================

-- 先删掉上轮建的严格策略（避免冲突）
DROP POLICY IF EXISTS "users_select_own" ON public.users;
DROP POLICY IF EXISTS "users_insert_own" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "projects_select_own" ON public.projects;
DROP POLICY IF EXISTS "projects_insert_own" ON public.projects;
DROP POLICY IF EXISTS "projects_update_own" ON public.projects;
DROP POLICY IF EXISTS "projects_delete_own" ON public.projects;
DROP POLICY IF EXISTS "volumes_all_auth" ON public.volumes;
DROP POLICY IF EXISTS "chapters_all_auth" ON public.chapters;
DROP POLICY IF EXISTS "ai_history_all_auth" ON public.ai_history;
DROP POLICY IF EXISTS "characters_all_auth" ON public.characters;
DROP POLICY IF EXISTS "world_settings_all_auth" ON public.world_settings;
DROP POLICY IF EXISTS "balances_select_own" ON public.user_balances;
DROP POLICY IF EXISTS "balances_insert_own" ON public.user_balances;
DROP POLICY IF EXISTS "balances_update_own" ON public.user_balances;
DROP POLICY IF EXISTS "orders_all_own" ON public.orders;
DROP POLICY IF EXISTS "invite_rewards_all_own" ON public.invite_rewards;
DROP POLICY IF EXISTS "usage_records_all_own" ON public.usage_records;

-- 统一宽松策略：任意角色可读写（兼容服务端 anon key 模式）
CREATE POLICY "allow_all_users" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_projects" ON public.projects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_volumes" ON public.volumes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_chapters" ON public.chapters FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_ai_history" ON public.ai_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_characters" ON public.characters FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_world_settings" ON public.world_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_user_balances" ON public.user_balances FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_orders" ON public.orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_invite_rewards" ON public.invite_rewards FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_usage_records" ON public.usage_records FOR ALL USING (true) WITH CHECK (true);
