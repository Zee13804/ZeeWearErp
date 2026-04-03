# Zee Wear ERP — Developer & VPS Update Guide

> **Yeh guide kisi bhi developer ya agent ke liye hai jo is project mein changes karna chahta ho.**
> Roman Urdu notes jahan zaroori lage, wahan diye gaye hain.

---

## 1. PROJECT OVERVIEW

**Zee Wear ERP** ek full-stack inventory + accounting management system hai.

| Part | Technology |
|------|-----------|
| Frontend | Next.js 16 (App Router, Tailwind CSS) |
| Backend API | Express.js (Node.js) |
| Database | SQLite (via Prisma ORM) |
| Server | Single `server.js` — Express + Next.js ek saath |
| Hosting | Ubuntu VPS at `72.62.248.155` (domain: `zeewear.devoriatech.com`) |
| Port | 5000 |
| Process Manager | PM2 (`pm2 restart zeewear`) |
| Git Repo | `https://github.com/Zee13804/ZeeWearErp` |

---

## 2. FOLDER STRUCTURE

```
/ (project root)
├── server.js              ← Entry point: starts Express + Next.js on port 5000
├── next.config.ts         ← Next.js configuration
├── package.json           ← Scripts: dev, build, start, setup
│
├── src/                   ← Next.js frontend (pages, components)
│   ├── app/               ← All pages (App Router)
│   │   ├── page.tsx           ← Home/dashboard page
│   │   ├── login/             ← Login page
│   │   ├── accounting/        ← Accounting module pages
│   │   │   ├── accounts/      ← Bank/cash accounts
│   │   │   ├── employees/     ← Payroll & employees
│   │   │   ├── suppliers/     ← Supplier management
│   │   │   ├── expenses/      ← Expense tracking
│   │   │   ├── invoices/      ← Customer invoices
│   │   │   └── reports/       ← Financial reports
│   │   ├── articles/          ← Product/article management
│   │   ├── fabric/            ← Fabric inventory
│   │   ├── accessories/       ← Accessories inventory
│   │   └── settings/          ← App settings & users
│   ├── components/        ← Reusable React components
│   └── lib/
│       └── auth.ts        ← Auth helpers (isAdmin, isAccountant, etc.)
│
├── backend/               ← Express backend API
│   ├── src/
│   │   ├── server.js      ← Express app setup, mounts all routes at /api
│   │   ├── routes/        ← All API route files
│   │   │   ├── authRoutes.js
│   │   │   ├── accountRoutes.js
│   │   │   ├── employeeRoutes.js
│   │   │   ├── supplierRoutes.js
│   │   │   ├── expenseRoutes.js
│   │   │   ├── invoiceRoutes.js
│   │   │   └── ... (more routes)
│   │   └── middleware/    ← Auth middleware (adminAuth, auth)
│   ├── prisma/
│   │   ├── schema.prisma  ← DATABASE SCHEMA — edit here to add/change tables
│   │   └── dev.db         ← SQLite database file (DO NOT delete!)
│   ├── setup.js           ← Wipes and recreates DB + admin user
│   └── node_modules/      ← Backend's own node_modules (separate from root)
│
└── uploads/               ← Uploaded images stored here
```

---

## 3. KEY FILES — KYA KARTA HAI KON SA FILE

| File | Kaam |
|------|------|
| `server.js` | App ka main entry point. Express + Next.js dono start karta hai. Mat chhedo unless you know what you're doing. |
| `backend/prisma/schema.prisma` | Database ka blueprint. Naya column ya table add karna ho to yahan edit karo. |
| `backend/src/server.js` | Express server. Sab routes yahan mount hote hain. |
| `backend/src/routes/employeeRoutes.js` | Employee CRUD API. `adminAuth` wale routes sirf admin kar sakta hai. |
| `backend/src/routes/accountRoutes.js` | Accounts API. Same — create/update sirf admin. |
| `backend/src/routes/supplierRoutes.js` | Supplier API. Same — create/update sirf admin. |
| `src/lib/auth.ts` | `isAdmin()`, `isAccountant()` helper functions. Frontend permissions yahan se aate hain. |
| `src/app/accounting/employees/page.tsx` | Employee page UI. |
| `src/app/accounting/accounts/page.tsx` | Accounts page UI. |
| `src/app/accounting/suppliers/page.tsx` | Suppliers page UI. |
| `backend/setup.js` | Careful! Yeh DB wipe kar ke admin user recreate karta hai. Sirf fresh setup pe use karo. |

---

## 4. USER ROLES & PERMISSIONS

| Role | Kya kar sakta hai |
|------|-------------------|
| `dev` | Sab kuch — system account |
| `admin` | Full access — create, edit, delete employees/accounts/suppliers/everything |
| `accountant` | Transactions kar sakta hai (salary, advance, expenses, invoices, purchases, payments, labour) — lekin employees/accounts/suppliers create/edit NAHI kar sakta |
| `store` | Inventory pages (articles, fabric, accessories) |
| `viewer` | Sirf dekhna — kuch edit nahi |

**Backend enforcement:** `adminAuth` middleware use hota hai create/update routes pe.
**Frontend enforcement:** `isAdmin()` function in `src/lib/auth.ts` — returns true only for `admin` and `dev` roles.

---

## 5. LOCAL DEVELOPMENT (REPLIT MEIN)

### Dev server start karna:
Replit automatically `npm run dev` run karta hai (workflow: "Start application").
Agar manually restart karna ho, workflow panel se restart karo.

### Code change karna:
1. File edit karo Replit editor mein
2. Dev server auto-reload hota hai (Next.js fast refresh)
3. Backend changes ke liye sometimes workflow restart karna padta hai

### Database changes (Replit mein):
Agar `backend/prisma/schema.prisma` mein koi change kiya to:
```bash
backend/node_modules/.bin/prisma db push --schema=backend/prisma/schema.prisma
```

### Admin user default credentials:
- Email: `admin@zeewear.com`
- Password: `admin123`

---

## 6. GITHUB PE PUSH KARNA (REPLIT SE VPS TAK)

**Important:** Pehle Replit mein changes karo, phir GitHub pe push karo, phir VPS pe deploy karo.

### Step 1 — GitHub pe push (Replit terminal se):
```bash
git add -A
git commit -m "Your change description here"
git remote set-url origin https://Zee13804:${GITHUB_TOKEN}@github.com/Zee13804/ZeeWearErp.git
git push origin main
```

> **Note:** `GITHUB_TOKEN` ek Replit secret hai. Isko kabhi copy-paste mat karo — yeh automatically environment mein hota hai.

---

## 7. VPS PE DEPLOY KARNA (Step-by-Step)

### VPS mein login karo:
- IP: `72.62.248.155`
- Panel: aaPanel
- SSH se access karo ya aaPanel terminal use karo

### VPS pe app directory:
```
/www/wwwroot/zeewear.devoriatech.com/
```

### Node.js path on VPS:
```
/www/server/nodejs/v20.20.2/bin/
```

---

### FULL DEPLOY PROCESS (yeh commands ek ek kar ke chalao):

#### Step 1 — GitHub se latest code lo:
```bash
cd /www/wwwroot/zeewear.devoriatech.com
git fetch origin main
git reset --hard origin/main
```

> **Kyun `git reset` aur `git pull` nahi?** — `.next` folder Git mein tracked hai, jis ki wajah se `git pull` conflict deta hai. `git reset --hard` force update karta hai.

#### Step 2 — Dependencies install karo (agar `package.json` change hua ho):
```bash
npm install
cd backend && npm install && cd ..
```

> Agar sirf code change hua aur koi naya package nahi add kiya, to yeh step skip kar sakte ho.

#### Step 3 — Database schema update karo (agar `schema.prisma` change hua ho):
```bash
DATABASE_URL="file:/www/wwwroot/zeewear.devoriatech.com/backend/prisma/dev.db" \
backend/node_modules/.bin/prisma db push \
--schema=backend/prisma/schema.prisma
```

> **Important:** Hamesha yahi command use karo. `npx prisma` mat use karo — VPS pe yeh Prisma v7 download kar leta hai jo break karta hai.

#### Step 4 — Next.js build karo:
```bash
npm run build
```

> Yeh 2-3 minute le sakta hai. Wait karo jab tak "Build completed" dikhaye.

#### Step 5 — App restart karo:
```bash
pm2 restart zeewear
```

#### Step 6 — Check karo app chal raha hai:
```bash
pm2 status
pm2 logs zeewear --lines 20
```

---

### QUICK CHEAT SHEET (copy-paste karo):

```bash
cd /www/wwwroot/zeewear.devoriatech.com && \
git fetch origin main && \
git reset --hard origin/main && \
DATABASE_URL="file:/www/wwwroot/zeewear.devoriatech.com/backend/prisma/dev.db" backend/node_modules/.bin/prisma db push --schema=backend/prisma/schema.prisma && \
npm run build && \
pm2 restart zeewear
```

> Yeh ek hi line mein sab kuch karta hai. Agar schema change nahi hua to prisma wali line hata do.

---

## 8. DATABASE SCHEMA CHANGE KARNA

### Kab karna padta hai?
Jab koi naya column, naya table, ya existing field mein change karna ho.

### Steps:

**Step 1 — Schema file edit karo:**
`backend/prisma/schema.prisma` open karo aur apna change karo.

Example — naya column add karna:
```prisma
model Employee {
  id          Int     @id @default(autoincrement())
  name        String
  designation String?
  phone       String?
  baseSalary  Float   @default(0)
  newField    String? @default("value")  // ← yeh add kiya
  ...
}
```

**Step 2 — Replit mein push karo:**
```bash
backend/node_modules/.bin/prisma db push --schema=backend/prisma/schema.prisma
```

**Step 3 — GitHub pe push karo** (Section 6 dekhein)

**Step 4 — VPS pe deploy karo** (Section 7 dekhein, Step 3 zaroor include karo)

### Important Field Names (galti mat karna):
| Model | Sahi naam | Galat naam |
|-------|-----------|------------|
| Employee | `baseSalary` | `basicSalary` (yeh exist nahi karta) |
| SupplierPurchaseItem | `unit` | (unit field exist karta hai — `@default("pcs")`) |

---

## 9. NAYI FEATURE ADD KARNA — WORKFLOW

1. **Replit mein backend route banao** — `backend/src/routes/myFeatureRoutes.js`
2. **Route mount karo** — `backend/src/server.js` mein `app.use('/my-feature', myFeatureRoutes)` add karo
3. **Frontend page banao** — `src/app/my-feature/page.tsx`
4. **Test karo** locally Replit mein
5. **GitHub pe push karo** (Section 6)
6. **VPS pe deploy karo** (Section 7)

---

## 10. TROUBLESHOOTING — COMMON MASAIL

### Problem: VPS pe site nahi khul rahi
```bash
pm2 status          # check karo zeewear running hai ya nahi
pm2 restart zeewear # restart karo
pm2 logs zeewear    # error logs dekho
```

### Problem: "Cannot find module" error
```bash
npm install
cd backend && npm install && cd ..
pm2 restart zeewear
```

### Problem: Database error / column not found
Schema push karo:
```bash
DATABASE_URL="file:/www/wwwroot/zeewear.devoriatech.com/backend/prisma/dev.db" \
backend/node_modules/.bin/prisma db push \
--schema=backend/prisma/schema.prisma
```

### Problem: Site purani dikhti hai (cache issue)
Browser mein hard refresh karo: **Ctrl+Shift+R** (ya incognito window use karo)
VPS pe dobara build karo: `npm run build && pm2 restart zeewear`

### Problem: Build fail ho rahi hai
```bash
pm2 logs zeewear --lines 50   # error message dekho
```
Aksar TypeScript type errors hote hain — Replit mein us file ko fix karo, push karo, dobara build karo.

### Problem: `npx prisma` ne naya version download kar liya
**Hamesha yeh use karo:**
```bash
backend/node_modules/.bin/prisma db push --schema=backend/prisma/schema.prisma
```
`npx prisma` kabhi mat use karo VPS pe — yeh v7 download karta hai jo incompatible hai.

### Problem: git pull conflict
```bash
git fetch origin main
git reset --hard origin/main
```

---

## 11. ENVIRONMENT VARIABLES

| Variable | Kahan set hota hai | Zaroorat |
|----------|-------------------|----------|
| `JWT_SECRET` | `.env` file ya VPS environment | Production pe required (auth ke liye) |
| `PORT` | Optional — default 5000 | Change karna ho to set karo |
| `DATABASE_URL` | `backend/src/server.js` automatically set karta hai | Manually set karne ki zaroorat nahi normally |
| `GITHUB_TOKEN` | Replit Secret | GitHub pe push karne ke liye |

---

## 12. QUICK REFERENCE CARD

```
VPS IP:          72.62.248.155
Domain:          zeewear.devoriatech.com
App Directory:   /www/wwwroot/zeewear.devoriatech.com/
DB File:         /www/wwwroot/zeewear.devoriatech.com/backend/prisma/dev.db
Node.js:         /www/server/nodejs/v20.20.2/bin/
PM2 App Name:    zeewear
Git Repo:        https://github.com/Zee13804/ZeeWearErp
Default Admin:   admin@zeewear.com / admin123
Port:            5000
```

---

> **Golden Rule:** Pehle Replit mein test karo → phir GitHub pe push karo → phir VPS pe deploy karo.
> Kabhi direct VPS pe code mat edit karo — agli baar `git reset` se woh changes wapas chale jayenge.
