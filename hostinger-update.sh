#!/bin/bash
set -euo pipefail
echo ""
echo "========================================"
echo "  Zee Wear ERP - Safe Update"
echo "  (Data will NOT be lost)"
echo "========================================"
echo ""

export PATH=/opt/alt/alt-nodejs20/root/usr/bin:$PATH

APPDIR="$HOME/domains/zeewear.devoriatech.com/nodejs"

cd "$APPDIR" || { echo "ERROR: App directory not found!"; exit 1; }

echo "[1/5] Backing up database and uploads..."
cp backend/prisma/dev.db backend/prisma/dev.db.backup 2>/dev/null
if [ -d uploads ]; then
  tar -czf uploads-backup.tar.gz uploads/ 2>/dev/null
  echo "  Database backed up to dev.db.backup"
  echo "  Uploads backed up to uploads-backup.tar.gz"
else
  echo "  Database backed up to dev.db.backup"
fi

echo ""
echo "[2/5] Pulling latest code from GitHub..."
git pull origin main

echo ""
echo "[3/5] Restoring database (if overwritten)..."
if [ ! -s backend/prisma/dev.db ]; then
  echo "  Database was overwritten, restoring backup..."
  cp backend/prisma/dev.db.backup backend/prisma/dev.db
else
  echo "  Database is intact."
fi

echo ""
echo "[4/5] Installing packages..."
npm install --production
cd backend
npm install
./node_modules/.bin/prisma generate
cd "$APPDIR"

echo ""
echo "[5/5] Copying Prisma client to root..."
mkdir -p node_modules/@prisma/client
cp -r backend/node_modules/@prisma/client/* node_modules/@prisma/client/

echo ""
echo "========================================"
echo "  Update Complete!"
echo "========================================"
echo ""
echo "  Now go to hPanel and click Restart."
echo "  Your data is safe - nothing was deleted."
echo ""
echo "  If something went wrong, restore backup:"
echo "  cp backend/prisma/dev.db.backup backend/prisma/dev.db"
echo "========================================"
echo ""
