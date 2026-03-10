#!/bin/bash
set -euo pipefail
echo ""
echo "========================================"
echo "  Zee Wear ERP - Hostinger First Install"
echo "========================================"
echo ""

export PATH=/opt/alt/alt-nodejs20/root/usr/bin:$PATH

APPDIR="$HOME/domains/zeewear.devoriatech.com/nodejs"

cd "$APPDIR" || { echo "ERROR: App directory not found!"; exit 1; }

echo "[1/6] Installing root packages..."
npm install --production

echo ""
echo "[2/6] Installing backend packages..."
cd backend
npm install
export DATABASE_URL="file:$APPDIR/backend/prisma/dev.db"

echo ""
echo "[3/6] Setting up database..."
rm -f prisma/dev.db
./node_modules/.bin/prisma db push --force-reset --accept-data-loss

echo ""
echo "[4/6] Generating Prisma client..."
./node_modules/.bin/prisma generate

echo ""
echo "[5/6] Copying Prisma client to root..."
cd "$APPDIR"
mkdir -p node_modules/@prisma/client
cp -r backend/node_modules/@prisma/client/* node_modules/@prisma/client/

echo ""
echo "[6/6] Creating admin account..."
cat > /tmp/create-admin.js << 'JSEOF'
const path = require('path');
const appDir = process.argv[2];
process.env.DATABASE_URL = 'file:' + path.join(appDir, 'backend', 'prisma', 'dev.db');
const { PrismaClient } = require(path.join(appDir, 'backend', 'node_modules', '@prisma', 'client'));
const bcrypt = require(path.join(appDir, 'backend', 'node_modules', 'bcryptjs'));
const prisma = new PrismaClient();
bcrypt.hash('admin123', 10).then(function(h) {
  return prisma.user.create({data:{email:'admin@zeewear.com',password:h,role:'dev'}});
}).then(function() {
  console.log('Admin account created.');
  return prisma.$disconnect();
}).catch(function(e) {
  console.error('Admin creation error:', e.message);
  prisma.$disconnect();
});
JSEOF
node /tmp/create-admin.js "$APPDIR"

echo ""
echo "========================================"
echo "  Installation Complete!"
echo "========================================"
echo ""
echo "  Login:  admin@zeewear.com / admin123"
echo ""
echo "  Now go to hPanel and click Restart."
echo "  Then open: https://zeewear.devoriatech.com"
echo ""
echo "  IMPORTANT: Change password after login!"
echo "========================================"
echo ""
