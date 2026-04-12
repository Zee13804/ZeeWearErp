/**
 * Zee Wear ERP - Safe Update Script
 *
 * Run this on VPS after every `git pull` to apply schema changes safely.
 * This script only adds new tables or columns — it never drops or resets data.
 * If Prisma detects a destructive change, it will abort and show an error
 * so you can review before proceeding.
 *
 * Usage:
 *   node backend/update.js
 *
 * What it does:
 *   1. Applies new database schema changes (adds tables/columns only)
 *   2. Regenerates the Prisma client
 *   3. Does NOT wipe, reset, or delete any existing records
 *
 * For a completely fresh install (new VPS, empty database), use: npm run setup
 */

const path = require("path");
const { execSync } = require("child_process");

const dbPath = path.join(__dirname, "prisma", "dev.db");
process.env.DATABASE_URL = `file:${dbPath}`;

const prismaPath = path.join(__dirname, "node_modules", ".bin", "prisma");

console.log("\n========================================");
console.log("  Zee Wear ERP - Safe Update");
console.log("========================================\n");

try {
  console.log("[1/2] Applying schema changes (existing data is preserved)...");
  execSync(`"${prismaPath}" db push --skip-generate`, {
    cwd: __dirname,
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: `file:${dbPath}`,
    },
  });

  console.log("[2/2] Regenerating Prisma client...");
  execSync(`"${prismaPath}" generate`, {
    cwd: __dirname,
    stdio: "inherit",
  });

  console.log("\n========================================");
  console.log("  Update Complete! Restart the app:");
  console.log("  pm2 restart all   (or your start command)");
  console.log("========================================\n");
} catch (err) {
  console.error("\n[ERROR] Update failed:", err.message);
  console.error(
    "If Prisma flagged a potentially destructive change, review the schema diff\n" +
    "and confirm it is safe before proceeding. Do NOT use --force-reset or\n" +
    "--accept-data-loss unless you are certain no records will be lost."
  );
  process.exit(1);
}
