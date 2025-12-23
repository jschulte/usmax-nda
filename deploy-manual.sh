#!/bin/bash
# Manual deployment script for demo server
# Run this locally when GitHub Actions can't connect

set -e

echo "🚀 Deploying to Demo Server (18.235.47.142)..."

ssh -i ~/.ssh/jonah-schulte-aws.pem ec2-user@18.235.47.142 << 'DEPLOY_SCRIPT'
set -e

echo "📦 Navigating to app directory..."
cd /home/usmax/app

echo "🔄 Pulling latest code..."
sudo -u usmax git pull origin main

echo "📥 Installing dependencies..."
sudo -u usmax pnpm install

echo "🗄️ Running database migrations..."
sudo -u usmax pnpm db:migrate deploy

echo "🔨 Generating Prisma client..."
sudo -u usmax pnpm db:generate

echo "🏗️ Building application..."
sudo -u usmax pnpm build

echo "🔄 Restarting service..."
sudo systemctl restart usmax-nda

echo "⏳ Waiting for service to start..."
sleep 5

echo "🏥 Health check..."
if curl -sf http://localhost:3000/api/health > /dev/null; then
  echo "✅ Deployment successful! Service is healthy."
else
  echo "⚠️ Service may not be responding. Checking logs..."
  sudo journalctl -u usmax-nda -n 20 --no-pager
  exit 1
fi

DEPLOY_SCRIPT

echo ""
echo "✅ Deployment complete!"
echo "🌐 Demo URL: http://18.235.47.142"
echo "🌐 CloudFront: https://d2j310eus7y1g6.cloudfront.net"
