#!/bin/bash
set -e

# ============================================================
#  Zee Wear ERP - VPS Safe Update Script
#  Run this whenever code changes from GitHub pe pull karne ho
#  Usage: bash vps-update.sh
# ============================================================

APP_DIR="/var/www/zeewear"
DB_PATH="$APP_DIR/backend/prisma/dev.db"

echo ""
echo "============================================================"
echo "  Zee Wear ERP - Safe Update (Data Safe Rahegi)"
echo "============================================================"
echo ""

cd $APP_DIR

# Backup database and uploads
echo "[1/6] Backing up data..."
cp $DB_PATH $DB_PATH.backup 2>/dev/null && echo "  Database backed up." || echo "  No database found."
tar -czf $APP_DIR/uploads-backup.tar.gz uploads/ 2>/dev/null && echo "  Uploads backed up." || echo "  No uploads found."

# Pull latest code
echo "[2/6] Pulling latest code..."
git pull origin main

# Restore DB if overwritten
echo "[3/6] Verifying database..."
if [ ! -s $DB_PATH ]; then
    echo "  Database was overwritten - restoring backup..."
    cp $DB_PATH.backup $DB_PATH
else
    echo "  Database intact."
fi

# Install packages
echo "[4/6] Installing packages..."
npm install
cd backend && npm install && ./node_modules/.bin/prisma generate && cd ..
mkdir -p node_modules/@prisma/client
cp -r backend/node_modules/@prisma/client/* node_modules/@prisma/client/

# Build Next.js
echo "[5/6] Building app..."
npm run build

# Restart PM2
echo "[6/6] Restarting app..."
pm2 restart zeewear-erp

echo ""
echo "============================================================"
echo "  Update Complete! App is running."
echo "  Logs dekhne ke liye: pm2 logs zeewear-erp"
echo "============================================================"
echo ""
