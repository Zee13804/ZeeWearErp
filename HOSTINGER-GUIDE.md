# Zee Wear ERP - Complete Hostinger Guide
# Ye guide Urdu/Roman mein hai taake asaani ho

---

## PART 1: PEHLI DAFA INSTALL (New System)

### Step 1: GitHub Repo Banayein (Agar Naya Hai)
1. GitHub.com pe login karein
2. "New Repository" banayein — naam: ZeeWearr
3. Public ya Private — aapki marzi
4. Repository banne ke baad, apne computer pe:
   ```
   cd C:\Users\zeesh\Desktop\ZeeWear
   mkdir ZeeWearr
   cd ZeeWearr
   git init
   ```
5. Downloaded zip extract karein aur sab files yahan paste karein
6. Push karein:
   ```
   git add .
   git commit -m "Zee Wear ERP initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/ZeeWearr.git
   git push -u origin main
   ```

### Step 2: Hostinger Pe Node.js App Banayein
1. Hostinger hPanel mein login karein
2. "Add Website" ya "Node.js Apps" pe jayein
3. "Import Git Repository" select karein
4. Apna GitHub account connect karein
5. ZeeWearr repo select karein
6. Settings:
   - Framework preset: Express
   - Branch: main
   - Node version: 20.x
   - Entry file: server.js
   - Package manager: npm
7. Environment Variables add karein:
   - JWT_SECRET = koi bhi lamba random string jaise: mYs3cr3tK3y2024xYz!@#AbC
   - NODE_ENV = production
8. "Deploy" ya "Save" karein
9. 100% deploy hone ka wait karein

### Step 3: SSH Se Setup
1. hPanel mein "SSH Access" kholein
2. SSH terminal mein ye commands chalayein:

```
export PATH=/opt/alt/alt-nodejs20/root/usr/bin:$PATH
cd ~/domains/YOUR-DOMAIN/nodejs/
bash hostinger-first-install.sh
```

(YOUR-DOMAIN ko apne domain se replace karein, jaise: zeewear.devoriatech.com)

3. Script complete hone ka wait karein
4. "Installation Complete!" message aayega

### Step 4: App Restart
1. hPanel mein wapas jayein
2. Node.js App settings mein "Restart" button dabayein
3. 1-2 minute wait karein
4. Browser mein apna domain kholein

### Step 5: Login
- Email: admin@zeewear.com
- Password: admin123
- FORAN password change karein Settings page se!

---

## PART 2: UPDATE KARNA (Bina Data Loss - SAFE)

Ye tab karein jab aap ne code mein koi change kiya ho (new feature, bug fix, etc.)

### Step 1: Code Changes Karein
- Replit pe ya apne computer pe code edit karein
- Agar frontend (src/ folder) mein changes hain:
  - Replit pe: `npm run build` chalayein
  - Ya computer pe (Node.js installed hona chahiye): `npm run build` chalayein
  - Build ke baad .next/ folder update ho jayega

### Step 2: Replit Se Download (Agar Replit Use Kar Rahe Hain)
1. Replit mein Files panel kholein
2. Upar 3 dots (menu) pe click karein
3. "Download as zip" select karein
4. Zip extract karein
5. Extracted files ko apne Desktop ke ZeeWearr folder mein paste karein
6. "Replace All" karein agar puche

### Step 3: GitHub Pe Push Karein
Computer ke Terminal/Command Prompt mein:
```
cd C:\Users\zeesh\Desktop\ZeeWear\ZeeWearr
git add .
git commit -m "Update: description of changes"
git push origin main
```

Agar token error aaye:
1. GitHub > Settings > Developer Settings > Personal Access Tokens > Tokens (classic)
2. "Generate new token" click karein
3. Naam dein, repo scope check karein
4. Token copy karein
5. Ye command chalayein:
   ```
   git remote set-url origin https://YOUR-USERNAME:YOUR-TOKEN@github.com/YOUR-USERNAME/ZeeWearr.git
   git push origin main
   ```

### Step 4: Hostinger Pe Update Apply Karein
SSH terminal mein:
```
export PATH=/opt/alt/alt-nodejs20/root/usr/bin:$PATH
cd ~/domains/YOUR-DOMAIN/nodejs/
bash hostinger-update.sh
```

Ye script:
- Pehle database aur uploads ka BACKUP leta hai
- Phir GitHub se latest code pull karta hai
- Agar database overwrite hua to backup se restore karta hai
- Packages install karta hai
- Sab kuch set karta hai

### Step 5: Restart
hPanel mein Node.js App > "Restart" button dabayein

### DATA SAFE HAI!
- Database (dev.db) ka backup banta hai: dev.db.backup
- Uploads ka backup banta hai: uploads-backup.tar.gz
- Agar kuch galat ho to restore karein:
  ```
  cd ~/domains/YOUR-DOMAIN/nodejs/
  cp backend/prisma/dev.db.backup backend/prisma/dev.db
  tar -xzf uploads-backup.tar.gz
  ```

---

## PART 3: ZAROORI BAATEIN

### KABHI MAT KAREIN (Live Server Pe):
- hostinger-first-install.sh KABHI mat chalayein live server pe (sab data delete ho jayega!)
- npm run setup KABHI mat chalayein live server pe
- backend/prisma/dev.db KABHI delete mat karein
- uploads/ folder KABHI delete mat karein

### Monthly Backup (Recommended):
SSH mein:
```
export PATH=/opt/alt/alt-nodejs20/root/usr/bin:$PATH
cd ~/domains/YOUR-DOMAIN/nodejs/
cp backend/prisma/dev.db ~/backup-$(date +%Y%m%d).db
tar -czf ~/backup-uploads-$(date +%Y%m%d).tar.gz uploads/
```

### Troubleshooting:

**403 Forbidden:**
- hPanel mein "Fix File Ownership" search karein aur Execute karein
- 2-3 minute wait karein

**503 Service Unavailable:**
- SSH mein logs dekkhein: `cat ~/domains/YOUR-DOMAIN/nodejs/console.log`
- Restart karein: `touch ~/domains/YOUR-DOMAIN/nodejs/tmp/restart.txt`

**Login Nahi Ho Raha:**
- Check karein: `ls -la ~/domains/YOUR-DOMAIN/nodejs/backend/prisma/dev.db`
- Agar 0 bytes hai: database corrupt hai, backup se restore karein

**Module Not Found Error:**
SSH mein:
```
export PATH=/opt/alt/alt-nodejs20/root/usr/bin:$PATH
cd ~/domains/YOUR-DOMAIN/nodejs/backend
npm install
export DATABASE_URL="file:$(pwd)/prisma/dev.db"
./node_modules/.bin/prisma generate
cd ..
mkdir -p node_modules/@prisma/client
cp -r backend/node_modules/@prisma/client/* node_modules/@prisma/client/
touch tmp/restart.txt
```

---

## PART 4: FILE STRUCTURE

```
ZeeWearr/
  server.js                    - Main server file
  package.json                 - Dependencies list
  next.config.ts               - Next.js settings
  .gitignore                   - Git ignore rules
  hostinger-first-install.sh   - First time setup script
  hostinger-update.sh          - Safe update script
  HOSTINGER-GUIDE.md           - This guide
  .next/                       - Pre-built frontend (DO NOT DELETE)
  src/                         - Frontend source code
  backend/
    src/                       - Backend API code
    prisma/
      schema.prisma            - Database structure
      dev.db                   - DATABASE (YOUR DATA - PROTECT!)
    package.json               - Backend dependencies
  uploads/                     - Uploaded images (YOUR DATA - PROTECT!)
```

## ENVIRONMENT VARIABLES (hPanel mein set karein)
| Variable | Value | Required |
|----------|-------|----------|
| JWT_SECRET | Koi bhi lamba random string | YES |
| NODE_ENV | production | YES |

---

## PART 5: NAYE REPLIT ACCOUNT SE KAAM KARNA

Agar aap naya Replit account use karna chahein ya kisi aur developer ko kaam dena ho:

1. Replit.com pe login karein
2. "Import from GitHub" click karein
3. URL dein: https://github.com/YOUR-USERNAME/ZeeWearr.git
4. Import complete hone ka wait karein
5. Replit Shell mein:
   ```
   npm install
   cd backend && npm install && cd ..
   npm run dev
   ```
6. App chal jayegi development mode mein
7. Changes karein, test karein
8. Jab ready ho: `npm run build`, download zip, push to GitHub, Hostinger pe update
