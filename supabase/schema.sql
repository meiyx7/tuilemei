-- 退了没 —— Supabase 数据库表结构 + RLS 策略
--
-- 执行方式：在 Supabase 控制台 → SQL Editor → 粘贴执行
--
-- 表 userData：每用户一条记录，按 openid 隔离
-- RLS 策略：anon 角色可 select/insert/update（小程序前端用 anon key），
--          但 delete 仅 service_role（管理员清理，前端不能删数据）

-- 1. 用户数据表
create table if not exists "userData" (
  openid text primary key,
  profile jsonb,
  checkins jsonb,
  changelog jsonb,
  onboarded boolean default false,
  "updatedAt" bigint default 0
);

-- 2. 启用行级安全
alter table "userData" enable row level security;

-- 3. RLS 策略
-- anon 角色（小程序前端）：允许 select / insert / update，禁止 delete
-- 注：数据隔离主要靠前端查询 .eq('openid', openid) + upsert onConflict，
--     非数据库层强隔离。对个人工具类小程序足够，管理员可用 service_role 清理。

-- 允许 anon 读取所有记录（前端查询时会用 .eq('openid') 过滤）
drop policy if exists "anon_select_userData" on "userData";
create policy "anon_select_userData" on "userData"
  for select to anon using (true);

-- 允许 anon 插入（upsert 需要）
drop policy if exists "anon_insert_userData" on "userData";
create policy "anon_insert_userData" on "userData"
  for insert to anon with check (true);

-- 允许 anon 更新（upsert 冲突时更新）
drop policy if exists "anon_update_userData" on "userData";
create policy "anon_update_userData" on "userData"
  for update to anon using (true) with check (true);

-- 4. 索引（按 updatedAt 查询最近更新的记录，用于清理脚本）
create index if not exists idx_userData_updatedAt on "userData" ("updatedAt" desc);

-- 5. Storage Bucket：存小程序码图片
-- 在 Supabase 控制台 → Storage → New bucket → name: minicode, public: true
-- 或执行：
insert into storage.buckets (id, name, public)
values ('minicode', 'minicode', true)
on conflict (id) do nothing;

-- 6. Storage 策略：允许 anon 上传和读取 minicode bucket
drop policy if exists "anon_upload_minicode" on storage.objects;
create policy "anon_upload_minicode" on storage.objects
  for insert to anon with check (bucket_id = 'minicode');

drop policy if exists "anon_read_minicode" on storage.objects;
create policy "anon_read_minicode" on storage.objects
  for select to anon using (bucket_id = 'minicode');
