#!/bin/bash
# Simple deploy script - updates demo EC2 server with latest code

set -e

echo "🚀 Deploying to demo server..."

# Find the instance ID by IP address
INSTANCE_ID=$(aws ec2 describe-instances \
  --filters "Name=ip-address,Values=18.235.47.142" \
  --query "Reservations[0].Instances[0].InstanceId" \
  --output text)

if [ "$INSTANCE_ID" = "None" ] || [ -z "$INSTANCE_ID" ]; then
  echo "❌ Could not find EC2 instance with IP 18.235.47.142"
  exit 1
fi

echo "📡 Found instance: $INSTANCE_ID"

# Run deployment commands via SSM
echo "📥 Running deployment on server..."
COMMAND_ID=$(aws ssm send-command \
  --instance-ids "$INSTANCE_ID" \
  --document-name "AWS-RunShellScript" \
  --parameters 'commands=[
    "cd /home/usmax/app",
    "sudo -u usmax git fetch origin",
    "sudo -u usmax git reset --hard origin/main",
    "sudo -u usmax pnpm install --no-frozen-lockfile",
    "sudo -u usmax pnpm db:generate",
    "sudo -u usmax pnpm build",
    "sudo systemctl restart usmax-nda",
    "sleep 5",
    "curl -sf http://localhost:3001/api/health && echo \"✅ Deployment successful!\" || echo \"⚠️ Health check failed\""
  ]' \
  --output text \
  --query "Command.CommandId")

echo "⏳ Waiting for deployment to complete..."
aws ssm wait command-executed \
  --command-id "$COMMAND_ID" \
  --instance-id "$INSTANCE_ID"

# Get the output
echo ""
echo "📋 Deployment output:"
aws ssm get-command-invocation \
  --command-id "$COMMAND_ID" \
  --instance-id "$INSTANCE_ID" \
  --query "StandardOutputContent" \
  --output text

echo ""
echo "🎉 Done!"
echo "🌐 Demo URL: http://18.235.47.142"
echo "🌐 CloudFront: https://d3s83cg96xp6l3.cloudfront.net"
