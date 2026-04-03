/**
 * reset-accounting.js
 * 
 * SAFE RESET: Deletes all accounting-related data from the VPS database.
 * KEEPS: Article, Variant, Fabric, FabricLedger, Accessory, AccessoryLedger,
 *        StockLedger, Image, User, ActivityLog, Purpose, RolePermission
 *
 * Run on VPS: node backend/scripts/reset-accounting.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Starting accounting data reset...\n');

  // Delete in dependency order (children before parents)

  console.log('  Deleting OutsourceVendorPayment...');
  const vp = await prisma.outsourceVendorPayment.deleteMany({});
  console.log(`    → ${vp.count} records deleted`);

  console.log('  Deleting OutsourceWorkEntry...');
  const we = await prisma.outsourceWorkEntry.deleteMany({});
  console.log(`    → ${we.count} records deleted`);

  console.log('  Deleting ProductionJob...');
  const pj = await prisma.productionJob.deleteMany({});
  console.log(`    → ${pj.count} records deleted`);

  console.log('  Deleting InvoicePayment...');
  const ip = await prisma.invoicePayment.deleteMany({});
  console.log(`    → ${ip.count} records deleted`);

  console.log('  Deleting InvoiceItem...');
  const ii = await prisma.invoiceItem.deleteMany({});
  console.log(`    → ${ii.count} records deleted`);

  console.log('  Deleting Invoice...');
  const inv = await prisma.invoice.deleteMany({});
  console.log(`    → ${inv.count} records deleted`);

  console.log('  Deleting Customer...');
  const cust = await prisma.customer.deleteMany({});
  console.log(`    → ${cust.count} records deleted`);

  console.log('  Deleting SupplierPayment...');
  const sp = await prisma.supplierPayment.deleteMany({});
  console.log(`    → ${sp.count} records deleted`);

  console.log('  Deleting SupplierPurchaseItem...');
  const spi = await prisma.supplierPurchaseItem.deleteMany({});
  console.log(`    → ${spi.count} records deleted`);

  console.log('  Deleting SupplierPurchase...');
  const spur = await prisma.supplierPurchase.deleteMany({});
  console.log(`    → ${spur.count} records deleted`);

  console.log('  Deleting Supplier...');
  const sup = await prisma.supplier.deleteMany({});
  console.log(`    → ${sup.count} records deleted`);

  console.log('  Deleting SalaryRecord...');
  const sr = await prisma.salaryRecord.deleteMany({});
  console.log(`    → ${sr.count} records deleted`);

  console.log('  Deleting Advance...');
  const adv = await prisma.advance.deleteMany({});
  console.log(`    → ${adv.count} records deleted`);

  console.log('  Deleting Employee...');
  const emp = await prisma.employee.deleteMany({});
  console.log(`    → ${emp.count} records deleted`);

  console.log('  Deleting LabourPayment...');
  const lp = await prisma.labourPayment.deleteMany({});
  console.log(`    → ${lp.count} records deleted`);

  console.log('  Deleting CourierPayment...');
  const cp = await prisma.courierPayment.deleteMany({});
  console.log(`    → ${cp.count} records deleted`);

  console.log('  Deleting Expense...');
  const exp = await prisma.expense.deleteMany({});
  console.log(`    → ${exp.count} records deleted`);

  console.log('  Deleting ExpenseCategory...');
  const ec = await prisma.expenseCategory.deleteMany({});
  console.log(`    → ${ec.count} records deleted`);

  console.log('  Deleting AccountTransfer...');
  const at = await prisma.accountTransfer.deleteMany({});
  console.log(`    → ${at.count} records deleted`);

  console.log('  Deleting Account...');
  const acc = await prisma.account.deleteMany({});
  console.log(`    → ${acc.count} records deleted`);

  // Reset SQLite autoincrement sequences for accounting tables
  const tables = [
    'OutsourceVendorPayment', 'OutsourceWorkEntry', 'ProductionJob',
    'InvoicePayment', 'InvoiceItem', 'Invoice', 'Customer',
    'SupplierPayment', 'SupplierPurchaseItem', 'SupplierPurchase', 'Supplier',
    'SalaryRecord', 'Advance', 'Employee', 'LabourPayment', 'CourierPayment',
    'Expense', 'ExpenseCategory', 'AccountTransfer', 'Account',
  ];

  console.log('\n  Resetting autoincrement sequences...');
  for (const t of tables) {
    try {
      await prisma.$executeRawUnsafe(
        `DELETE FROM sqlite_sequence WHERE name = '${t}'`
      );
    } catch (_) { /* table may not be in sequence yet */ }
  }
  console.log('    → Done');

  console.log('\n✅ Accounting data reset complete!');
  console.log('   Kept intact: Article, Variant, Fabric, Accessory, StockLedger, User, Image, etc.\n');
}

main()
  .catch(e => {
    console.error('\n❌ Error:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
