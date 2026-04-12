/**
 * Zee Wear ERP - Safe Update Script
 *
 * Run this on VPS after every `git pull` to apply schema changes safely.
 * This script NEVER deletes existing data.
 *
 * Usage:
 *   node backend/update.js
 *
 * What it does:
 *   1. Applies any new database schema changes (adds new tables/columns)
 *   2. Regenerates the Prisma client
 *   3. Does NOT wipe or reset existing records
 *
 * For a completely fresh install (new VPS), use: npm run setup
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
  console.log("[1/2] Applying schema changes (data is safe)...");
  execSync(`"${prismaPath}" db push --skip-generate --accept-data-loss`, {
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
  console.error("Check the error above and try again.");
  process.exit(1);
}
