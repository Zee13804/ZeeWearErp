#!/bin/bash
set -e

APP_DIR="/www/wwwroot/zeewear.devoriatech.com"
NODE_BIN="/www/server/nodejs/v20.20.2/bin"
DB_PATH="$APP_DIR/backend/prisma/dev.db"

export PATH=$PATH:$NODE_BIN

echo ""
echo "========================================"
echo "   Zee Wear ERP - Safe Update"
echo "========================================"
echo ""

cd "$APP_DIR"

echo "[1/5] Database backup..."
cp "$DB_PATH" "$DB_PATH.backup" 2>/dev/null && echo "  Backed up." || echo "  No DB found, skipping."

echo "[2/5] Pulling latest code..."
git config --global --add safe.directory "$APP_DIR" 2>/dev/null || true
git pull origin main

echo "[3/5] Verifying database..."
if [ ! -s "$DB_PATH" ]; then
  echo "  Restoring backup..."
  cp "$DB_PATH.backup" "$DB_PATH"
else
  echo "  Database intact."
fi

echo "[4/5] Installing dependencies & building..."
npm install
cd backend && npm install
DATABASE_URL="file:$DB_PATH" ./node_modules/.bin/prisma generate
DATABASE_URL="file:$DB_PATH" ./node_modules/.bin/prisma db push
cd ..
npm run build

chown -R www:www "$APP_DIR"

echo "[5/5] Restarting app..."
pkill -f "node server.js" 2>/dev/null || true
sleep 1
NODE_ENV=production nohup node server.js >> /tmp/zeewear.log 2>&1 &

echo ""
echo "========================================"
echo "   Update Complete!"
echo "   Logs: tail -f /tmp/zeewear.log"
echo "========================================"
echo ""
