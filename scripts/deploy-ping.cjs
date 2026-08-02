#!/usr/bin/env node
// 部署后探针：由 webhook(route.ts) 在 pm2 restart 之后自动调用。
// 作用：curl 线上站点拿到 HTTP 状态，并把"部署 ping"写回 Supabase transactions 表，
//      供本地环境（出网受限）通过 REST API 间接确认部署成败。全程无需人工。
// 依赖：@supabase/supabase-js（服务端已有）；环境变量由 .env.local 经 Next 注入。

const { createClient } = require('@supabase/supabase-js');
const { execSync } = require('child_process');
const https = require('https');

const SUPABASE_URL = 'https://khgnjblnukxteyufvjym.supabase.co';
// 优先用 service_role（若有），否则用 anon（transactions 表 RLS 为 allow all，anon 可写）
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_BQ91PYvokaGrK6UU6shFjQ_oO-BVsm9';
const KEY = SERVICE_KEY || ANON_KEY;

const supabase = createClient(SUPABASE_URL, KEY, { auth: { persistSession: false } });

function curlStatus(url) {
  return new Promise((resolve) => {
    const req = https.get(url, (res) => { resolve(res.statusCode || 0); res.resume(); });
    req.on('error', () => resolve(0));
    req.setTimeout(8000, () => { req.destroy(); resolve(0); });
  });
}

function getCommit() {
  try { return execSync('git rev-parse HEAD').toString().trim(); } catch { return 'unknown'; }
}

(async () => {
  const commit = getCommit();
  const httpStatus = await curlStatus('https://zbjh.top/');
  const ok = httpStatus >= 200 && httpStatus < 500;
  const note = JSON.stringify({ commit, httpStatus, ok, at: new Date().toISOString() });

  const { error } = await supabase
    .from('transactions')
    .insert({ project: 'system', type: 'deploy_ping', amount: 0, note });

  if (error) {
    console.error('DEPLOY_PING_ERR', error.message);
    process.exit(1);
  }
  console.log('DEPLOY_PING_DONE commit=' + commit + ' http=' + httpStatus + ' ok=' + ok);
})().catch((e) => {
  console.error('DEPLOY_PING_ERR', e.message);
  process.exit(1);
});
