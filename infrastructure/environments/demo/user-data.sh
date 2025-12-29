#!/bin/bash
set -e

# =============================================================================
# USmax NDA Demo Instance Bootstrap Script
# Installs: PostgreSQL 15, Node.js 20, pnpm, Caddy, and the application
# =============================================================================

exec > >(tee /var/log/user-data.log) 2>&1
echo "Starting bootstrap at $(date)"

# Variables from Terraform
DOMAIN_NAME="${domain_name}"
ADMIN_EMAIL="${admin_email}"
DB_PASSWORD="${db_password}"
APP_REPO="${app_repo}"
COGNITO_REGION="${cognito_region}"

# =============================================================================
# System Updates
# =============================================================================
echo "Updating system packages..."
dnf update -y
# Use --allowerasing to resolve curl-minimal vs curl conflicts
dnf install -y --allowerasing git curl wget jq

# =============================================================================
# Install PostgreSQL 15
# =============================================================================
echo "Installing PostgreSQL 15..."
dnf install -y postgresql15-server postgresql15

# Initialize and start PostgreSQL
postgresql-setup --initdb
systemctl enable postgresql
systemctl start postgresql

# Configure PostgreSQL
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD '$DB_PASSWORD';"
sudo -u postgres psql -c "CREATE DATABASE usmax_nda;"
sudo -u postgres psql -c "CREATE USER usmax_admin WITH PASSWORD '$DB_PASSWORD';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE usmax_nda TO usmax_admin;"
sudo -u postgres psql -c "ALTER DATABASE usmax_nda OWNER TO usmax_admin;"

# Allow local connections with password
sed -i 's/ident/md5/g' /var/lib/pgsql/data/pg_hba.conf
sed -i 's/peer/md5/g' /var/lib/pgsql/data/pg_hba.conf
systemctl restart postgresql

# =============================================================================
# Install Node.js 20
# =============================================================================
echo "Installing Node.js 20..."
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
dnf install -y nodejs

# Install pnpm
npm install -g pnpm

# =============================================================================
# Install Caddy (for HTTPS)
# =============================================================================
echo "Installing Caddy..."
# Use official Caddy static binary (COPR doesn't support Amazon Linux 2023)
curl -L "https://github.com/caddyserver/caddy/releases/download/v2.8.4/caddy_2.8.4_linux_amd64.tar.gz" -o /tmp/caddy.tar.gz
tar -xzf /tmp/caddy.tar.gz -C /usr/local/bin caddy
chmod +x /usr/local/bin/caddy
rm /tmp/caddy.tar.gz

# Create caddy user and directories
groupadd --system caddy || true
useradd --system --gid caddy --create-home --home-dir /var/lib/caddy --shell /usr/sbin/nologin caddy || true
mkdir -p /etc/caddy
mkdir -p /var/log/caddy
chown caddy:caddy /var/log/caddy

# Create systemd service for Caddy
cat > /etc/systemd/system/caddy.service << 'CADDY_SERVICE'
[Unit]
Description=Caddy web server
Documentation=https://caddyserver.com/docs/
After=network.target network-online.target
Requires=network-online.target

[Service]
Type=notify
User=caddy
Group=caddy
ExecStart=/usr/local/bin/caddy run --environ --config /etc/caddy/Caddyfile
ExecReload=/usr/local/bin/caddy reload --config /etc/caddy/Caddyfile
TimeoutStopSec=5s
LimitNOFILE=1048576
LimitNPROC=512
PrivateTmp=true
ProtectSystem=full
AmbientCapabilities=CAP_NET_BIND_SERVICE

[Install]
WantedBy=multi-user.target
CADDY_SERVICE

# =============================================================================
# Create app user
# =============================================================================
echo "Creating app user..."
useradd -m -s /bin/bash usmax || true
mkdir -p /home/usmax/app
chown -R usmax:usmax /home/usmax

# =============================================================================
# Clone and setup application
# =============================================================================
echo "Cloning application..."
cd /home/usmax
sudo -u usmax git clone "$APP_REPO" app || {
  echo "Git clone failed, creating placeholder..."
  mkdir -p app
}

cd /home/usmax/app

# Create .env file
cat > /home/usmax/app/.env << EOF
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://usmax_admin:$DB_PASSWORD@localhost:5432/usmax_nda
USE_MOCK_AUTH=true
FRONTEND_URL=https://$DOMAIN_NAME
AWS_REGION=$COGNITO_REGION
EOF

chown usmax:usmax /home/usmax/app/.env
chmod 600 /home/usmax/app/.env

# Install dependencies and build (if repo was cloned)
if [ -f "package.json" ]; then
  echo "Installing dependencies..."
  sudo -u usmax pnpm install --frozen-lockfile || sudo -u usmax pnpm install

  echo "Generating Prisma client..."
  sudo -u usmax pnpm db:generate

  echo "Running database migrations..."
  sudo -u usmax pnpm db:migrate || echo "Migration failed, may need manual intervention"

  echo "Building application..."
  sudo -u usmax pnpm build
fi

# =============================================================================
# Create systemd service for the app
# =============================================================================
echo "Creating systemd service..."
cat > /etc/systemd/system/usmax-nda.service << EOF
[Unit]
Description=USmax NDA Application
After=network.target postgresql.service

[Service]
Type=simple
User=usmax
WorkingDirectory=/home/usmax/app
ExecStart=/usr/bin/node dist/server/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
EnvironmentFile=/home/usmax/app/.env

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable usmax-nda

# Start the app if it was built
if [ -f "/home/usmax/app/dist/server/index.js" ]; then
  systemctl start usmax-nda
fi

# =============================================================================
# Configure Caddy for HTTPS
# =============================================================================
echo "Configuring Caddy..."

if [ -n "$DOMAIN_NAME" ] && [ "$DOMAIN_NAME" != "null" ]; then
  # Production config with real domain
  cat > /etc/caddy/Caddyfile << EOF
$DOMAIN_NAME {
    reverse_proxy localhost:3001

    encode gzip

    header {
        X-Content-Type-Options nosniff
        X-Frame-Options DENY
        Referrer-Policy strict-origin-when-cross-origin
    }

    log {
        output file /var/log/caddy/access.log
    }
}
EOF
else
  # Development config - use IP with self-signed cert
  cat > /etc/caddy/Caddyfile << EOF
:443 {
    tls internal
    reverse_proxy localhost:3001

    encode gzip
}

:80 {
    reverse_proxy localhost:3001
}
EOF
fi

mkdir -p /var/log/caddy
systemctl enable caddy
systemctl start caddy

# =============================================================================
# Create helper scripts
# =============================================================================
echo "Creating helper scripts..."

# Deployment script
cat > /home/usmax/deploy.sh << 'EOF'
#!/bin/bash
set -e
cd /home/usmax/app
git pull origin main
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm build
sudo systemctl restart usmax-nda
echo "Deployment complete!"
EOF
chmod +x /home/usmax/deploy.sh
chown usmax:usmax /home/usmax/deploy.sh

# Status script
cat > /home/usmax/status.sh << 'EOF'
#!/bin/bash
echo "=== USmax NDA Demo Status ==="
echo ""
echo "App Service:"
systemctl status usmax-nda --no-pager | head -5
echo ""
echo "PostgreSQL:"
systemctl status postgresql --no-pager | head -5
echo ""
echo "Caddy:"
systemctl status caddy --no-pager | head -5
echo ""
echo "App Logs (last 10 lines):"
journalctl -u usmax-nda --no-pager | tail -10
EOF
chmod +x /home/usmax/status.sh
chown usmax:usmax /home/usmax/status.sh

# =============================================================================
# Firewall (optional, using security groups instead)
# =============================================================================
# systemctl enable firewalld
# systemctl start firewalld
# firewall-cmd --permanent --add-service=http
# firewall-cmd --permanent --add-service=https
# firewall-cmd --permanent --add-service=ssh
# firewall-cmd --reload

# =============================================================================
# Done
# =============================================================================
echo ""
echo "=============================================="
echo "Bootstrap complete at $(date)"
echo "=============================================="
echo ""
echo "Next steps:"
echo "1. Point your domain ($DOMAIN_NAME) to this server's IP"
echo "2. SSH in and run: sudo -u usmax /home/usmax/status.sh"
echo "3. If app didn't start, check: journalctl -u usmax-nda -f"
echo ""
echo "To redeploy after code changes:"
echo "  sudo -u usmax /home/usmax/deploy.sh"
echo ""
