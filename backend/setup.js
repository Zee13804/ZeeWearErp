const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");

process.env.DATABASE_URL = `file:${path.join(__dirname, "prisma", "dev.db")}`;

const dbPath = path.join(__dirname, "prisma", "dev.db");
const uploadsPath = path.join(__dirname, "..", "uploads");

async function setup() {
  console.log("\n========================================");
  console.log("  Zee Wear ERP - Fresh Installation");
  console.log("========================================\n");

  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
    console.log("[1/5] Old database removed.");
  } else {
    console.log("[1/5] No existing database found.");
  }

  if (fs.existsSync(uploadsPath)) {
    const files = fs.readdirSync(uploadsPath);
    for (const file of files) {
      fs.unlinkSync(path.join(uploadsPath, file));
    }
    console.log(`[2/5] Uploads folder cleared (${files.length} files removed).`);
  } else {
    fs.mkdirSync(uploadsPath, { recursive: true });
    console.log("[2/5] Uploads folder created.");
  }

  console.log("[3/5] Creating fresh database...");
  const prismaPath = path.join(__dirname, "node_modules", ".bin", "prisma");
  execSync(`"${prismaPath}" db push --force-reset --accept-data-loss`, {
    cwd: __dirname,
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: `file:${dbPath}`,
      PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION: "yes proceed with fresh install",
    },
  });

  console.log("[4/5] Generating Prisma client...");
  execSync(`"${prismaPath}" generate`, {
    cwd: __dirname,
    stdio: "inherit",
  });

  delete require.cache[require.resolve("@prisma/client")];
  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient();
  const bcrypt = require("bcryptjs");

  const email = "admin@zeewear.com";
  const password = "admin123";
  const hashedPassword = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      role: "dev",
    },
  });

  await prisma.$disconnect();

  console.log("[5/5] Super Admin account created.\n");
  console.log("========================================");
  console.log("  Installation Complete!");
  console.log("========================================");
  console.log(`\n  Login with:`);
  console.log(`  Email:    ${email}`);
  console.log(`  Password: ${password}`);
  console.log(`\n  Role: Super Admin (dev)`);
  console.log(`  You can create more users after login.\n`);
  console.log("  Start the app with: npm run dev");
  console.log("========================================\n");
}

setup().catch((err) => {
  console.error("\nSetup failed:", err.message);
  process.exit(1);
});
