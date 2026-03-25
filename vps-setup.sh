#!/bin/bash
set -e

# ============================================================
#  Zee Wear ERP - Ubuntu VPS First-Time Setup Script
#  Run this ONCE on a fresh Ubuntu 22.04 / 24.04 VPS
#  Usage: bash vps-setup.sh YOUR_DOMAIN JWT_SECRET_KEY
# ============================================================

DOMAIN=${1:-"yourdomain.com"}
JWT_SECRET=${2:-"change-this-to-a-long-random-secret"}
APP_DIR="/var/www/zeewear"
REPO_URL="https://github.com/Zee13804/ZeeWearErp.git"
NODE_VERSION="20"

echo ""
echo "============================================================"
echo "  Zee Wear ERP - VPS Setup"
echo "  Domain: $DOMAIN"
echo "============================================================"
echo ""

# 1. System update
echo "[1/9] System update..."
apt-get update -y && apt-get upgrade -y

# 2. Install Node.js 20
echo "[2/9] Installing Node.js $NODE_VERSION..."
curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
apt-get install -y nodejs

# 3. Install PM2 + Nginx
echo "[3/9] Installing PM2 and Nginx..."
npm install -g pm2
apt-get install -y nginx

# 4. Clone repo
echo "[4/9] Cloning repository..."
mkdir -p $APP_DIR
git clone $REPO_URL $APP_DIR
cd $APP_DIR

# 5. Create .env file
echo "[5/9] Setting environment variables..."
cat > $APP_DIR/.env << EOF
NODE_ENV=production
PORT=5000
JWT_SECRET=$JWT_SECRET
EOF

# 6. Install dependencies
echo "[6/9] Installing packages..."
npm install
cd backend && npm install && cd ..

# 7. Database setup
echo "[7/9] Setting up database..."
cd backend
export DATABASE_URL="file:$(pwd)/prisma/dev.db"
./node_modules/.bin/prisma db push
./node_modules/.bin/prisma generate
cd ..

mkdir -p node_modules/@prisma/client
cp -r backend/node_modules/@prisma/client/* node_modules/@prisma/client/

# 8. Build Next.js
echo "[8/9] Building Next.js app..."
mkdir -p logs
npm run build

# 9. Configure Nginx
echo "[9/9] Configuring Nginx..."
cat > /etc/nginx/sites-available/zeewear << NGINX
server {
    listen 80;
    server_name $DOMAIN;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 60s;
        proxy_connect_timeout 10s;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/zeewear /etc/nginx/sites-enabled/zeewear
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

# Start app with PM2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup | tail -1 | bash

echo ""
echo "============================================================"
echo "  Setup Complete!"
echo "============================================================"
echo ""
echo "  App running at: http://$DOMAIN"
echo "  Login:"
echo "    Email:    admin@zeewear.com"
echo "    Password: admin123"
echo ""
echo "  HTTPS setup (run after DNS points to this server):"
echo "    apt-get install -y certbot python3-certbot-nginx"
echo "    certbot --nginx -d $DOMAIN"
echo ""
echo "  Useful commands:"
echo "    pm2 status          - App status dekhein"
echo "    pm2 logs zeewear-erp - Live logs dekhein"
echo "    pm2 restart zeewear-erp - Restart karein"
echo "    bash /var/www/zeewear/vps-update.sh - Update karein"
echo "============================================================"
