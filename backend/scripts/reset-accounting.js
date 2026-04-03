/**
 * reset-accounting.js
 * 
 * SAFE RESET: Deletes all accounting-related data using raw SQL.
 * KEEPS: Article, Variant, Fabric, FabricLedger, Accessory, AccessoryLedger,
 *        StockLedger, Image, User, ActivityLog, Purpose, RolePermission
 *
 * Run on VPS: node backend/scripts/reset-accounting.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const tables = [
  'OutsourceVendorPayment',
  'OutsourceWorkEntry',
  'ProductionJob',
  'InvoicePayment',
  'InvoiceItem',
  'Invoice',
  'Customer',
  'SupplierPayment',
  'SupplierPurchaseItem',
  'SupplierPurchase',
  'Supplier',
  'SalaryRecord',
  'Advance',
  'Employee',
  'LabourPayment',
  'CourierPayment',
  'Expense',
  'ExpenseCategory',
  'AccountTransfer',
  'Account',
];

async function main() {
  console.log('🧹 Starting accounting data reset...\n');

  // Disable FK checks temporarily for SQLite
  await prisma.$executeRawUnsafe('PRAGMA foreign_keys = OFF;');

  for (const table of tables) {
    try {
      const result = await prisma.$executeRawUnsafe(`DELETE FROM "${table}"`);
      console.log(`  ✓ ${table}: ${result} rows deleted`);
    } catch (e) {
      console.log(`  ⚠ ${table}: skipped (${e.message})`);
    }
  }

  // Reset autoincrement sequences
  console.log('\n  Resetting autoincrement sequences...');
  for (const table of tables) {
    try {
      await prisma.$executeRawUnsafe(
        `DELETE FROM sqlite_sequence WHERE name = '${table}'`
      );
    } catch (_) {}
  }

  // Re-enable FK checks
  await prisma.$executeRawUnsafe('PRAGMA foreign_keys = ON;');

  console.log('\n✅ Accounting data reset complete!');
  console.log('   Kept intact: Article, Variant, Fabric, Accessory, StockLedger, User, Image etc.\n');
}

main()
  .catch(e => {
    console.error('\n❌ Error:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
