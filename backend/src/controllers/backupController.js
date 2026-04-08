const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');

const UPLOADS_DIR = path.join(__dirname, '..', '..', '..', 'uploads');

function readImageAsBase64(imageUrl) {
  try {
    if (!imageUrl) return null;
    const filename = imageUrl.replace('/uploads/', '').replace('/api/uploads/', '');
    const filePath = path.join(UPLOADS_DIR, filename);
    if (!fs.existsSync(filePath)) return null;
    const buffer = fs.readFileSync(filePath);
    const ext = path.extname(filename).toLowerCase().replace('.', '');
    const mime = ext === 'webp' ? 'image/webp' : ext === 'png' ? 'image/png' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/webp';
    return `data:${mime};base64,${buffer.toString('base64')}`;
  } catch (e) {
    return null;
  }
}

const exportBackup = async (req, res) => {
  try {
    const [
      articles, fabrics, accessories, purposes, users, images,
      stockLedger, fabricLedger, accessoryLedger,
      accounts, accountTransfers,
      suppliers, supplierPurchases, supplierPurchaseItems, supplierPayments,
      customers, invoices, invoiceItems, invoicePayments,
      expenseCategories, expenses,
      employees, advances, salaryRecords, labourPayments,
    ] = await Promise.all([
      prisma.article.findMany({ where: { isActive: true }, include: { variants: true } }),
      prisma.fabric.findMany({ where: { isActive: true } }),
      prisma.accessory.findMany({ where: { isActive: true } }),
      prisma.purpose.findMany({ where: { isActive: true } }),
      prisma.user.findMany({ where: { role: { not: 'dev' } }, select: { id: true, email: true, role: true } }),
      prisma.image.findMany(),
      prisma.stockLedger.findMany(),
      prisma.fabricLedger.findMany(),
      prisma.accessoryLedger.findMany(),
      prisma.account.findMany(),
      prisma.accountTransfer.findMany(),
      prisma.supplier.findMany(),
      prisma.supplierPurchase.findMany(),
      prisma.supplierPurchaseItem.findMany(),
      prisma.supplierPayment.findMany(),
      prisma.customer.findMany(),
      prisma.invoice.findMany({ include: { items: true, payments: true } }),
      prisma.invoiceItem.findMany(),
      prisma.invoicePayment.findMany(),
      prisma.expenseCategory.findMany(),
      prisma.expense.findMany(),
      prisma.employee.findMany(),
      prisma.advance.findMany(),
      prisma.salaryRecord.findMany(),
      prisma.labourPayment.findMany(),
    ]);

    const imageFiles = {};
    const allImageUrls = new Set();
    images.forEach(img => { if (img.url) allImageUrls.add(img.url); });
    fabrics.forEach(f => { if (f.imageUrl) allImageUrls.add(f.imageUrl); });
    accessories.forEach(a => { if (a.imageUrl) allImageUrls.add(a.imageUrl); });
    expenses.forEach(e => { if (e.billImage) allImageUrls.add(e.billImage); });

    for (const url of allImageUrls) {
      const base64 = readImageAsBase64(url);
      if (base64) imageFiles[url] = base64;
    }

    const totalArticles = articles.length;
    const totalVariants = articles.reduce((sum, a) => sum + (a.variants ? a.variants.length : 0), 0);

    const backup = {
      exportedAt: new Date().toISOString(),
      version: '3.0',
      summary: {
        articles: totalArticles,
        variants: totalVariants,
        fabrics: fabrics.length,
        accessories: accessories.length,
        purposes: purposes.length,
        users: users.length,
        images: images.length,
        imageFiles: Object.keys(imageFiles).length,
        stockMovements: stockLedger.length,
        fabricMovements: fabricLedger.length,
        accessoryMovements: accessoryLedger.length,
        accounts: accounts.length,
        accountTransfers: accountTransfers.length,
        suppliers: suppliers.length,
        supplierPurchases: supplierPurchases.length,
        customers: customers.length,
        invoices: invoices.length,
        expenseCategories: expenseCategories.length,
        expenses: expenses.length,
        employees: employees.length,
        advances: advances.length,
        salaryRecords: salaryRecords.length,
        labourPayments: labourPayments.length,
      },
      data: {
        articles, fabrics, accessories, purposes, users, images,
        stockLedger, fabricLedger, accessoryLedger,
        accounts, accountTransfers,
        suppliers, supplierPurchases, supplierPurchaseItems, supplierPayments,
        customers, invoices, invoiceItems, invoicePayments,
        expenseCategories, expenses,
        employees, advances, salaryRecords, labourPayments,
      },
      imageFiles,
    };

    const date = new Date().toISOString().split('T')[0];
    const filename = `erp-backup-${date}.json`;

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.json(backup);
  } catch (error) {
    console.error('Backup export error:', error);
    res.status(500).json({ error: 'Failed to export backup' });
  }
};

function saveBase64Image(imageUrl, base64Data) {
  try {
    if (!base64Data || !imageUrl) return false;
    const filename = imageUrl.replace('/uploads/', '').replace('/api/uploads/', '');
    const filePath = path.join(UPLOADS_DIR, filename);
    if (fs.existsSync(filePath)) return true;
    if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    const matches = base64Data.match(/^data:.+;base64,(.+)$/);
    if (!matches) return false;
    const buffer = Buffer.from(matches[1], 'base64');
    fs.writeFileSync(filePath, buffer);
    return true;
  } catch (e) {
    console.error('Failed to save image:', imageUrl, e.message);
    return false;
  }
}

const importBackup = async (req, res) => {
  try {
    const backup = req.body;
    if (!backup || !backup.data) {
      return res.status(400).json({ error: 'Invalid backup file format. Expected { exportedAt, data: { ... } }' });
    }

    const {
      articles, fabrics, accessories, purposes, images: backupImages,
      stockLedger, fabricLedger, accessoryLedger,
      accounts, accountTransfers,
      suppliers, supplierPurchases, supplierPurchaseItems, supplierPayments,
      customers, invoices, invoiceItems, invoicePayments,
      expenseCategories, expenses,
      employees, advances, salaryRecords, labourPayments,
    } = backup.data;

    const imageFiles = backup.imageFiles || {};
    const counts = {
      articles: 0, variants: 0, fabrics: 0, accessories: 0, purposes: 0,
      images: 0, imageFiles: 0, skipped: 0,
      accounts: 0, suppliers: 0, customers: 0, invoices: 0,
      expenses: 0, employees: 0, salaryRecords: 0, advances: 0, labourPayments: 0,
    };

    const articleIdMap = {};
    const fabricIdMap = {};
    const accessoryIdMap = {};
    const variantIdMap = {};
    const accountIdMap = {};
    const supplierIdMap = {};
    const customerIdMap = {};
    const invoiceIdMap = {};
    const employeeIdMap = {};
    const expenseCategoryIdMap = {};

    // --- Purposes ---
    if (purposes && purposes.length > 0) {
      for (const p of purposes) {
        await prisma.purpose.upsert({
          where: { name: p.name },
          update: { type: p.type || 'general', isActive: p.isActive !== false },
          create: { name: p.name, type: p.type || 'general', isActive: p.isActive !== false },
        });
        counts.purposes++;
      }
    }

    // --- Fabrics ---
    if (fabrics && fabrics.length > 0) {
      for (const f of fabrics) {
        const existing = await prisma.fabric.findFirst({ where: { name: f.name, type: f.type, color: f.color } });
        if (existing) {
          if (f.id) fabricIdMap[f.id] = existing.id;
          counts.skipped++;
        } else {
          if (f.imageUrl && imageFiles[f.imageUrl]) saveBase64Image(f.imageUrl, imageFiles[f.imageUrl]);
          const created = await prisma.fabric.create({
            data: { name: f.name, type: f.type, color: f.color, season: f.season || null, meters: f.meters || 0, imageUrl: f.imageUrl || null, isActive: f.isActive !== false },
          });
          if (f.id) fabricIdMap[f.id] = created.id;
          counts.fabrics++;
        }
      }
    }

    // --- Accessories ---
    if (accessories && accessories.length > 0) {
      for (const a of accessories) {
        const existing = await prisma.accessory.findFirst({ where: { name: a.name, category: a.category } });
        if (existing) {
          if (a.id) accessoryIdMap[a.id] = existing.id;
          counts.skipped++;
        } else {
          if (a.imageUrl && imageFiles[a.imageUrl]) saveBase64Image(a.imageUrl, imageFiles[a.imageUrl]);
          const created = await prisma.accessory.create({
            data: { name: a.name, category: a.category, unit: a.unit, quantity: a.quantity || 0, imageUrl: a.imageUrl || null, isActive: a.isActive !== false },
          });
          if (a.id) accessoryIdMap[a.id] = created.id;
          counts.accessories++;
        }
      }
    }

    // --- Articles + Variants ---
    if (articles && articles.length > 0) {
      for (const art of articles) {
        try {
          const existing = await prisma.article.findFirst({ where: { name: art.name, collection: art.collection || '', season: art.season || '', fabric: art.fabric || '' } });
          if (existing) {
            if (art.id) articleIdMap[art.id] = existing.id;
            counts.skipped++;
          } else {
            const newArticle = await prisma.article.create({
              data: { name: art.name, collection: art.collection || '', fabric: art.fabric || '', season: art.season || '', category: art.category || 'General', description: art.description || null, costPrice: art.costPrice || null, sellingPrice: art.sellingPrice || null, isActive: art.isActive !== false },
            });
            if (art.id) articleIdMap[art.id] = newArticle.id;
            counts.articles++;
            if (art.variants && art.variants.length > 0) {
              for (const v of art.variants) {
                try {
                  const skuExists = await prisma.variant.findFirst({ where: { sku: v.sku } });
                  if (!skuExists) {
                    let importBarcode = v.barcode || null;
                    if (importBarcode) {
                      const bcExists = await prisma.variant.findFirst({ where: { barcode: importBarcode } });
                      if (bcExists) importBarcode = null;
                    }
                    const newVariant = await prisma.variant.create({
                      data: { sku: v.sku, size: v.size || '', type: v.type || '', color: v.color || '', quantity: v.quantity || 0, barcode: importBarcode, isActive: v.isActive !== false, articleId: newArticle.id },
                    });
                    if (v.id) variantIdMap[v.id] = newVariant.id;
                    counts.variants++;
                  } else {
                    if (v.id) variantIdMap[v.id] = skuExists.id;
                  }
                } catch (vErr) {
                  console.error(`Variant skip (sku=${v.sku}):`, vErr.message);
                  counts.skipped++;
                }
              }
            }
          }
        } catch (artErr) {
          console.error(`Article skip (name=${art.name}):`, artErr.message);
          counts.skipped++;
        }
      }
    }

    // --- Images ---
    if (backupImages && backupImages.length > 0) {
      for (const img of backupImages) {
        if (img.url && imageFiles[img.url]) {
          const saved = saveBase64Image(img.url, imageFiles[img.url]);
          if (saved) counts.imageFiles++;
        }
        const newArticleId = img.articleId ? (articleIdMap[img.articleId] || null) : null;
        const newVariantId = img.variantId ? (variantIdMap[img.variantId] || null) : null;
        if (newArticleId || newVariantId) {
          const existingImg = await prisma.image.findFirst({ where: { ...(newArticleId ? { articleId: newArticleId } : {}), ...(newVariantId ? { variantId: newVariantId } : {}) } });
          if (!existingImg) {
            await prisma.image.create({ data: { url: img.url, alt: img.alt || null, sortOrder: img.sortOrder || 0, articleId: newArticleId, variantId: newVariantId } });
            counts.images++;
          }
        }
      }
    }

    // --- Stock / Fabric / Accessory Ledgers ---
    if (stockLedger && stockLedger.length > 0) {
      const existingKeys = new Set();
      const existing = await prisma.stockLedger.findMany({ select: { sku: true, movementType: true, qty: true, createdAt: true } });
      existing.forEach(l => existingKeys.add(`${l.sku}-${l.movementType}-${l.qty}-${new Date(l.createdAt).getTime()}`));
      for (const sl of stockLedger) {
        const key = `${sl.sku}-${sl.movementType}-${sl.qty}-${new Date(sl.createdAt).getTime()}`;
        if (!existingKeys.has(key)) {
          await prisma.stockLedger.create({ data: { sku: sl.sku, movementType: sl.movementType, qty: sl.qty, purpose: sl.purpose || 'Import', note: sl.note || null, destination: sl.destination || null, reference: sl.reference || null, productionOrderId: sl.productionOrderId || null, createdAt: sl.createdAt ? new Date(sl.createdAt) : new Date() } });
        }
      }
    }
    if (fabricLedger && fabricLedger.length > 0) {
      for (const fl of fabricLedger) {
        const newFabricId = fl.fabricId ? (fabricIdMap[fl.fabricId] || null) : null;
        if (newFabricId) await prisma.fabricLedger.create({ data: { fabricId: newFabricId, movementType: fl.movementType, meters: fl.meters, purpose: fl.purpose || 'Import', note: fl.note || null, component: fl.component || null, productionOrderId: fl.productionOrderId || null, createdAt: fl.createdAt ? new Date(fl.createdAt) : new Date() } });
      }
    }
    if (accessoryLedger && accessoryLedger.length > 0) {
      for (const al of accessoryLedger) {
        const newAccId = al.accessoryId ? (accessoryIdMap[al.accessoryId] || null) : null;
        if (newAccId) await prisma.accessoryLedger.create({ data: { accessoryId: newAccId, movementType: al.movementType, quantity: al.quantity, purpose: al.purpose || 'Import', note: al.note || null, createdAt: al.createdAt ? new Date(al.createdAt) : new Date() } });
      }
    }

    // --- Accounts ---
    if (accounts && accounts.length > 0) {
      for (const acc of accounts) {
        const existing = await prisma.account.findFirst({ where: { name: acc.name } });
        if (existing) {
          accountIdMap[acc.id] = existing.id;
        } else {
          const created = await prisma.account.create({
            data: { name: acc.name, type: acc.type, openingBalance: acc.openingBalance || 0, description: acc.description || null, isActive: acc.isActive !== false },
          });
          accountIdMap[acc.id] = created.id;
          counts.accounts++;
        }
      }
    }

    // --- Account Transfers ---
    if (accountTransfers && accountTransfers.length > 0) {
      for (const t of accountTransfers) {
        const fromId = accountIdMap[t.fromAccountId];
        const toId = accountIdMap[t.toAccountId];
        if (fromId && toId) {
          await prisma.accountTransfer.create({
            data: { fromAccountId: fromId, toAccountId: toId, amount: t.amount, date: t.date ? new Date(t.date) : new Date(), description: t.description || null },
          });
        }
      }
    }

    // --- Expense Categories ---
    if (expenseCategories && expenseCategories.length > 0) {
      for (const ec of expenseCategories) {
        const existing = await prisma.expenseCategory.findFirst({ where: { name: ec.name } });
        if (existing) {
          expenseCategoryIdMap[ec.id] = existing.id;
        } else {
          const created = await prisma.expenseCategory.create({ data: { name: ec.name } });
          expenseCategoryIdMap[ec.id] = created.id;
        }
      }
    }

    // --- Expenses ---
    if (expenses && expenses.length > 0) {
      for (const e of expenses) {
        const accId = accountIdMap[e.accountId] || null;
        const catId = expenseCategoryIdMap[e.categoryId] || null;
        if (e.billImage && imageFiles[e.billImage]) saveBase64Image(e.billImage, imageFiles[e.billImage]);
        await prisma.expense.create({
          data: { accountId: accId, categoryId: catId, amount: e.amount, description: e.description || null, billImage: e.billImage || null, expenseDate: e.expenseDate ? new Date(e.expenseDate) : (e.date ? new Date(e.date) : new Date()) },
        });
        counts.expenses++;
      }
    }

    // --- Suppliers ---
    if (suppliers && suppliers.length > 0) {
      for (const s of suppliers) {
        const existing = await prisma.supplier.findFirst({ where: { name: s.name } });
        if (existing) {
          supplierIdMap[s.id] = existing.id;
        } else {
          const created = await prisma.supplier.create({
            data: { name: s.name, phone: s.phone || null, address: s.address || null },
          });
          supplierIdMap[s.id] = created.id;
          counts.suppliers++;
        }
      }
    }

    // --- Supplier Purchases ---
    if (supplierPurchases && supplierPurchases.length > 0) {
      for (const sp of supplierPurchases) {
        const suppId = supplierIdMap[sp.supplierId];
        const accId = accountIdMap[sp.accountId] || null;
        if (!suppId) continue;
        const created = await prisma.supplierPurchase.create({
          data: { supplierId: suppId, totalAmount: sp.totalAmount || 0, purchaseDate: sp.purchaseDate ? new Date(sp.purchaseDate) : (sp.date ? new Date(sp.date) : new Date()), description: sp.description || null, invoiceNo: sp.invoiceNo || null },
        });
        // Items
        if (supplierPurchaseItems) {
          const items = supplierPurchaseItems.filter(i => i.purchaseId === sp.id);
          for (const item of items) {
            await prisma.supplierPurchaseItem.create({ data: { purchaseId: created.id, description: item.description, quantity: item.quantity || 1, unitPrice: item.unitPrice || 0, totalPrice: item.totalPrice || 0 } });
          }
        }
        // Payments
        if (supplierPayments) {
          const pmts = supplierPayments.filter(p => p.purchaseId === sp.id);
          for (const pmt of pmts) {
            const pmtAccId = accountIdMap[pmt.accountId] || null;
            await prisma.supplierPayment.create({ data: { supplierId: suppId, accountId: pmtAccId, amount: pmt.amount, paymentDate: pmt.paymentDate ? new Date(pmt.paymentDate) : (pmt.date ? new Date(pmt.date) : new Date()), note: pmt.note || null } });
          }
        }
      }
    }

    // --- Customers ---
    if (customers && customers.length > 0) {
      for (const c of customers) {
        const existing = await prisma.customer.findFirst({ where: { name: c.name, phone: c.phone || null } });
        if (existing) {
          customerIdMap[c.id] = existing.id;
        } else {
          const created = await prisma.customer.create({
            data: { name: c.name, phone: c.phone || null, address: c.address || null },
          });
          customerIdMap[c.id] = created.id;
          counts.customers++;
        }
      }
    }

    // --- Employees (must come before Invoices so employeeIdMap is populated) ---
    if (employees && employees.length > 0) {
      for (const emp of employees) {
        const existing = await prisma.employee.findFirst({ where: { name: emp.name, phone: emp.phone || undefined } });
        if (existing) {
          employeeIdMap[emp.id] = existing.id;
        } else {
          const created = await prisma.employee.create({
            data: { name: emp.name, designation: emp.designation || null, phone: emp.phone || null, monthlySalary: emp.monthlySalary || emp.baseSalary || 0, joinDate: emp.joinDate ? new Date(emp.joinDate) : (emp.joiningDate ? new Date(emp.joiningDate) : null), isActive: emp.isActive !== false },
          });
          employeeIdMap[emp.id] = created.id;
          counts.employees++;
        }
      }
    }

    // --- Invoices ---
    if (invoices && invoices.length > 0) {
      for (const inv of invoices) {
        const custId = customerIdMap[inv.customerId];
        if (!custId) continue;
        const existing = await prisma.invoice.findFirst({ where: { invoiceNo: inv.invoiceNo } });
        if (existing) {
          invoiceIdMap[inv.id] = existing.id;
          counts.skipped++;
          continue;
        }
        const invEmpId = inv.employeeId ? (employeeIdMap[inv.employeeId] || null) : null;
        const created = await prisma.invoice.create({
          data: { invoiceNo: inv.invoiceNo, customerId: custId, employeeId: invEmpId, invoiceDate: inv.invoiceDate ? new Date(inv.invoiceDate) : new Date(), dueDate: inv.dueDate ? new Date(inv.dueDate) : null, totalAmount: inv.totalAmount || 0, discount: inv.discount || 0, paidAmount: inv.paidAmount || 0, status: inv.status || 'unpaid', note: inv.note || null },
        });
        invoiceIdMap[inv.id] = created.id;
        counts.invoices++;
        // Items
        const items = (inv.items || invoiceItems?.filter(i => i.invoiceId === inv.id) || []);
        for (const item of items) {
          await prisma.invoiceItem.create({ data: { invoiceId: created.id, description: item.description, quantity: item.quantity || 1, unitPrice: item.unitPrice || 0, totalPrice: item.totalPrice || 0 } });
        }
        // Payments
        const pmts = (inv.payments || invoicePayments?.filter(p => p.invoiceId === inv.id) || []);
        for (const pmt of pmts) {
          const pmtAccId = accountIdMap[pmt.accountId] || null;
          await prisma.invoicePayment.create({ data: { invoiceId: created.id, accountId: pmtAccId, amount: pmt.amount, paymentDate: pmt.paymentDate ? new Date(pmt.paymentDate) : (pmt.date ? new Date(pmt.date) : new Date()), note: pmt.note || null } });
        }
      }
    }

    // --- Advances ---
    if (advances && advances.length > 0) {
      for (const adv of advances) {
        const empId = employeeIdMap[adv.employeeId];
        const accId = accountIdMap[adv.accountId] || null;
        if (!empId) continue;
        await prisma.advance.create({
          data: { employeeId: empId, accountId: accId, amount: adv.amount, repaid: adv.repaid || 0, advanceDate: adv.advanceDate ? new Date(adv.advanceDate) : (adv.date ? new Date(adv.date) : new Date()), reason: adv.reason || null },
        });
        counts.advances++;
      }
    }

    // --- Salary Records ---
    if (salaryRecords && salaryRecords.length > 0) {
      for (const sr of salaryRecords) {
        const empId = employeeIdMap[sr.employeeId];
        const accId = accountIdMap[sr.accountId] || null;
        if (!empId) continue;
        const existing = await prisma.salaryRecord.findFirst({ where: { employeeId: empId, month: sr.month, year: sr.year } });
        if (!existing) {
          await prisma.salaryRecord.create({
            data: { employeeId: empId, accountId: accId, month: sr.month, year: sr.year, baseSalary: sr.baseSalary || 0, advanceDeducted: sr.advanceDeducted || 0, absenceDays: sr.absenceDays || 0, absenceDeduction: sr.absenceDeduction || 0, invoiceDeducted: sr.invoiceDeducted || 0, netSalary: sr.netSalary || 0, isPaid: sr.isPaid || false, paidAt: sr.paidAt ? new Date(sr.paidAt) : null, note: sr.note || null },
          });
          counts.salaryRecords++;
        }
      }
    }

    // --- Labour Payments ---
    if (labourPayments && labourPayments.length > 0) {
      for (const lp of labourPayments) {
        const accId = accountIdMap[lp.accountId] || null;
        await prisma.labourPayment.create({
          data: { accountId: accId, workerName: lp.workerName, amount: lp.amount, paymentDate: lp.paymentDate ? new Date(lp.paymentDate) : new Date(), description: lp.description || null, note: lp.note || null },
        });
        counts.labourPayments++;
      }
    }

    res.json({ message: 'Backup imported successfully', imported: counts });
  } catch (error) {
    console.error('Backup import error:', error);
    res.status(500).json({ error: 'Failed to import backup: ' + error.message });
  }
};

module.exports = { exportBackup, importBackup };
