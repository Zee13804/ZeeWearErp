const path = require("path");

process.env.DATABASE_URL = `file:${path.join(__dirname, "..", "prisma", "dev.db")}`;

const express = require("express");

const authRoutes = require("./routes/authRoutes");
const articleRoutes = require("./routes/articleRoutes");
const variantRoutes = require("./routes/variantRoutes");
const stockRoutes = require("./routes/stockRoutes");
const fabricRoutes = require("./routes/fabricRoutes");
const accessoryRoutes = require("./routes/accessoryRoutes");
const userRoutes = require("./routes/userRoutes");
const reportRoutes = require("./routes/reportRoutes");

const activityLogRoutes = require("./routes/activityLogRoutes");
const imageRoutes = require("./routes/imageRoutes");
const importRoutes = require("./routes/importRoutes");
const purposeRoutes = require("./routes/purposeRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const backupRoutes = require("./routes/backupRoutes");
const searchRoutes = require("./routes/searchRoutes");
const permissionRoutes = require("./routes/permissionRoutes");

const accountRoutes = require("./routes/accountRoutes");
const supplierRoutes = require("./routes/supplierRoutes");
const invoiceRoutes = require("./routes/invoiceRoutes");
const expenseRoutes = require("./routes/expenseRoutes");
const employeeRoutes = require("./routes/employeeRoutes");
const accountingReportRoutes = require("./routes/accountingReportRoutes");
const productionJobRoutes = require("./routes/productionJobRoutes");
const courierPaymentRoutes = require("./routes/courierPaymentRoutes");
const settingsRoutes = require("./routes/settingsRoutes");

const { authenticate, authenticateAndEnforceReadOnly } = require("./middleware/authMiddleware");

const app = express();

app.use(express.json({ limit: '50mb' }));

app.use("/uploads", express.static(path.join(__dirname, "..", "..", "uploads")));

app.get("/test", (req, res) => {
  res.json({ message: "Backend ready" });
});

app.use("/auth", authRoutes);
app.use("/articles", authenticateAndEnforceReadOnly, articleRoutes);
app.use("/variants", authenticateAndEnforceReadOnly, variantRoutes);
app.use("/stock", authenticateAndEnforceReadOnly, stockRoutes);
app.use("/fabric", authenticateAndEnforceReadOnly, fabricRoutes);
app.use("/accessories", authenticateAndEnforceReadOnly, accessoryRoutes);
app.use("/users", userRoutes);
app.use("/reports", reportRoutes);

app.use("/activity-logs", activityLogRoutes);
app.use("/images", authenticateAndEnforceReadOnly, imageRoutes);
app.use("/import", authenticateAndEnforceReadOnly, importRoutes);
app.use("/purposes", authenticateAndEnforceReadOnly, purposeRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/backup", authenticate, backupRoutes);
app.use("/search", authenticate, searchRoutes);
app.use("/permissions", permissionRoutes);

app.use("/accounting/accounts", accountRoutes);
app.use("/accounting/suppliers", supplierRoutes);
app.use("/accounting/invoices", invoiceRoutes);
app.use("/accounting/expenses", expenseRoutes);
app.use("/accounting/employees", employeeRoutes);
app.use("/accounting/reports", accountingReportRoutes);
app.use("/accounting/production-jobs", productionJobRoutes);
app.use("/accounting/courier-payments", courierPaymentRoutes);
app.use("/settings", settingsRoutes);

const { startScheduler } = require('./services/schedulerService');
startScheduler().catch(err => console.error('[Scheduler] Start failed:', err.message));

const { PrismaClient } = require('@prisma/client');
(async () => {
  const _prisma = new PrismaClient();
  try {
    const count = await _prisma.expenseCategory.count();
    if (count === 0) {
      const defaults = ["Material Purchase", "Labour", "Office", "Supplier Payment", "Other"];
      await Promise.all(defaults.map(name => _prisma.expenseCategory.create({ data: { name } })));
      console.log("[seed] Default expense categories created");
    }
  } catch (_e) {
  } finally {
    await _prisma.$disconnect();
  }
})();

module.exports = app;
