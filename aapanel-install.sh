#!/bin/bash
set -e

REPO="https://github.com/Zee13804/ZeeWearErp.git"
APP_DIR="/www/wwwroot/zeewear.devoriatech.com"
NODE_BIN="/www/server/nodejs/v20.20.2/bin"
DB_PATH="$APP_DIR/backend/prisma/dev.db"

export PATH=$PATH:$NODE_BIN

echo ""
echo "========================================"
echo "   Zee Wear ERP - aaPanel Installer"
echo "========================================"
echo ""

if [ ! -d "$APP_DIR" ]; then
  mkdir -p "$APP_DIR"
fi

cd "$APP_DIR"

echo "[1/7] Downloading code from GitHub..."
git config --global --add safe.directory "$APP_DIR" 2>/dev/null || true
if [ -d ".git" ]; then
  git fetch origin main && git reset --hard origin/main
else
  git init
  git remote add origin "$REPO"
  git fetch origin main
  git reset --hard origin/main
fi

echo "[2/7] Creating .env file..."
cat > .env <<EOF
NODE_ENV=production
PORT=5000
JWT_SECRET=zeewear-$(date +%s)-$(shuf -i 1000-9999 -n 1)
DATABASE_URL=file:$DB_PATH
EOF

cat > backend/.env <<EOF
DATABASE_URL=file:$DB_PATH
EOF

echo "[3/7] Installing root dependencies..."
npm install

echo "[4/7] Installing backend dependencies..."
cd backend && npm install && cd ..

echo "[5/7] Setting up database..."
DATABASE_URL="file:$DB_PATH" ./backend/node_modules/.bin/prisma db push --schema=./backend/prisma/schema.prisma
DATABASE_URL="file:$DB_PATH" ./backend/node_modules/.bin/prisma generate --schema=./backend/prisma/schema.prisma

echo "[6/7] Creating admin user..."
DATABASE_URL="file:$DB_PATH" node -e "
const {PrismaClient} = require('./backend/node_modules/@prisma/client');
const bcrypt = require('./backend/node_modules/bcryptjs');
const prisma = new PrismaClient();
bcrypt.hash('admin123', 10)
  .then(h => prisma.user.create({data:{email:'admin@zeewear.com',password:h,role:'dev'}}))
  .then(u => { console.log('Admin created:', u.email); prisma.\$disconnect(); })
  .catch(e => { if(e.code==='P2002') console.log('Admin already exists.'); else console.error(e); prisma.\$disconnect(); });
"

echo "[7/7] Building app..."
npm run build

chown -R www:www "$APP_DIR"

echo ""
echo "========================================"
echo "   Installation Complete!"
echo "========================================"
echo ""
echo "  Login:    admin@zeewear.com"
echo "  Password: admin123"
echo ""
echo "  Start: node $APP_DIR/server.js"
echo "  Or use aaPanel Node Project > Start"
echo "========================================"
echo ""
