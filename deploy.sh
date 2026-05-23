#!/bin/bash
# ============================================
# 执笔惊鸿AI写作助手 - 阿里云部署脚本
# 用法: chmod +x deploy.sh && ./deploy.sh
# 注意: 运行前先在同目录创建 .env.local
# ============================================

set -e

PROJECT_DIR=$(dirname "$0")
cd "$PROJECT_DIR"

echo "========================================"
echo "  1/6 检查环境变量..."
echo "========================================"

if [ ! -f .env.local ]; then
  echo "❌ 未找到 .env.local 文件！"
  echo "   请复制 .env.example 为 .env.local 并填入配置后再运行"
  exit 1
fi

echo "✅ .env.local 已存在"

echo ""
echo "========================================"
echo "  2/6 检查 Node.js..."
echo "========================================"

if ! command -v node &> /dev/null; then
  echo "📦 安装 Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt install -y nodejs
fi

NODE_VER=$(node -v)
echo "✅ Node.js $NODE_VER"

echo ""
echo "========================================"
echo "  3/6 安装 PM2..."
echo "========================================"

if ! command -v pm2 &> /dev/null; then
  npm install -g pm2
fi
echo "✅ PM2 $(pm2 -v)"

echo ""
echo "========================================"
echo "  4/6 安装项目依赖..."
echo "========================================"

npm install

echo ""
echo "========================================"
echo "  5/6 构建项目..."
echo "========================================"

npm run build

echo ""
echo "========================================"
echo "  6/6 启动服务..."
echo "========================================"

# 创建日志目录
mkdir -p logs

# 停止旧实例（如果有）
pm2 delete ai-writer 2>/dev/null || true

# 启动新实例
pm2 start ecosystem.config.cjs --env production

# 保存进程列表（开机自启需要）
pm2 save

echo ""
echo "========================================"
echo "  ✅ 部署完成！"
echo ""
echo "  本地访问: http://localhost:3000"
echo ""
echo "  管理命令:"
echo "    pm2 status          查看进程状态"
echo "    pm2 logs ai-writer  查看实时日志"
echo "    pm2 restart ai-writer  重启服务"
echo ""
echo "  如果配了 Nginx，请执行:"
echo "    cp nginx.conf /etc/nginx/sites-available/ai-writer"
echo "    ln -s /etc/nginx/sites-available/ai-writer /etc/nginx/sites-enabled/"
echo "    # 修改 nginx.conf 中的 server_name"
echo "    nginx -t && systemctl restart nginx"
echo "========================================"
