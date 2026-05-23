// PM2 进程管理配置
// 用法: pm2 start ecosystem.config.cjs
module.exports = {
  apps: [{
    name: 'ai-writer',
    script: 'node_modules/next/dist/bin/next',
    args: 'start -p 3000',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
    // 流式响应需要超时时间长
    kill_timeout: 10000,
    // 内存超过512M自动重启
    max_memory_restart: '512M',
    // 日志
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
  }]
};
