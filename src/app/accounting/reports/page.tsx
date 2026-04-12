"use client";

import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { apiGet } from "@/lib/api";
import { showToast } from "@/components/ui/toast";
import { Loader2, Download, Printer } from "lucide-react";

function fmt(n: number) { return n.toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }
function pct(a: number, b: number) { return b === 0 ? "0%" : Math.round((a / b) * 100) + "%"; }

type ReportTab = "pl" | "ledger" | "suppliers" | "receivables" | "payroll" | "monthly" | "expenses" | "collection" | "balance" | "cashflow" | "sales" | "costs" | "annual-payroll" | "salary-sheet" | "advance-report" | "labour-report" | "invoice-status" | "supplier-ledger" | "production-jobs" | "salary-due";

const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function AccountingReportsPage() {
  const [tab, setTab] = useState<ReportTab>("pl");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [accounts, setAccounts] = useState<Array<{ id: number; name: string }>>([]);

  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [ledgerFilter, setLedgerFilter] = useState({ accountId: "", dateFrom: "", dateTo: "" });
  const [payrollFilter, setPayrollFilter] = useState({ month: "", year: String(new Date().getFullYear()) });
  const [monthlyYear, setMonthlyYear] = useState(String(new Date().getFullYear()));
  const [expenseRange, setExpenseRange] = useState({ from: "", to: "" });
  const [collectionRange, setCollectionRange] = useState({ from: "", to: "" });
  const [cashFlowRange, setCashFlowRange] = useState({ from: "", to: "" });
  const [salesRange, setSalesRange] = useState({ from: "", to: "", status: "all" });
  const [costsRange, setCostsRange] = useState({ from: "", to: "" });
  const [annualPayrollYear, setAnnualPayrollYear] = useState(String(new Date().getFullYear()));
  const [salarySheetFilter, setSalarySheetFilter] = useState({ month: "", year: String(new Date().getFullYear()) });
  const [advanceReportFilter, setAdvanceReportFilter] = useState({ status: "all" });
  const [labourRange, setLabourRange] = useState({ from: "", to: "" });
  const [invoiceStatusRange, setInvoiceStatusRange] = useState({ from: "", to: "" });
  const [supplierRange, setSupplierRange] = useState({ from: "", to: "" });
  const [receivableRange, setReceivableRange] = useState({ from: "", to: "", status: "outstanding" });
  const [balanceRange, setBalanceRange] = useState({ from: "", to: "" });
  const [supplierLedgerFilter, setSupplierLedgerFilter] = useState({ supplierId: "", from: "", to: "" });
  const [supplierList, setSupplierList] = useState<Array<{ id: number; name: string }>>([]);
  const [productionJobsFilter, setProductionJobsFilter] = useState({ from: "", to: "", status: "all" });
  const [salaryDueFilter, setSalaryDueFilter] = useState({ month: String(new Date().getMonth() + 1), year: String(new Date().getFullYear()) });

  useEffect(() => {
    apiGet("/accounting/accounts").then(r => setAccounts(r.accounts || [])).catch(() => {});
    apiGet("/accounting/suppliers").then(r => setSupplierList(r.suppliers || [])).catch(() => {});
  }, []);

  const load = async () => {
    setLoading(true);
    setData(null);
    try {
      let res;
      if (tab === "pl") {
        const params = new URLSearchParams();
        if (dateRange.from) params.set("dateFrom", dateRange.from);
        if (dateRange.to) params.set("dateTo", dateRange.to);
        res = await apiGet(`/accounting/reports/profit-loss?${params}`);
      } else if (tab === "ledger") {
        const params = new URLSearchParams();
        if (ledgerFilter.accountId) params.set("accountId", ledgerFilter.accountId);
        if (ledgerFilter.dateFrom) params.set("dateFrom", ledgerFilter.dateFrom);
        if (ledgerFilter.dateTo) params.set("dateTo", ledgerFilter.dateTo);
        res = await apiGet(`/accounting/reports/ledger?${params}`);
      } else if (tab === "suppliers") {
        const params = new URLSearchParams();
        if (supplierRange.from) params.set("dateFrom", supplierRange.from);
        if (supplierRange.to) params.set("dateTo", supplierRange.to);
        res = await apiGet(`/accounting/reports/suppliers?${params}`);
      } else if (tab === "receivables") {
        const params = new URLSearchParams();
        if (receivableRange.from) params.set("dateFrom", receivableRange.from);
        if (receivableRange.to) params.set("dateTo", receivableRange.to);
        if (receivableRange.status !== "outstanding") params.set("status", receivableRange.status === "all" ? "all" : receivableRange.status);
        res = await apiGet(`/accounting/reports/receivables?${params}`);
      } else if (tab === "payroll") {
        const params = new URLSearchParams();
        if (payrollFilter.month) params.set("month", payrollFilter.month);
        if (payrollFilter.year) params.set("year", payrollFilter.year);
        res = await apiGet(`/accounting/reports/payroll?${params}`);
      } else if (tab === "monthly") {
        res = await apiGet(`/accounting/reports/monthly-breakdown?year=${monthlyYear}`);
      } else if (tab === "expenses") {
        const params = new URLSearchParams();
        if (expenseRange.from) params.set("dateFrom", expenseRange.from);
        if (expenseRange.to) params.set("dateTo", expenseRange.to);
        res = await apiGet(`/accounting/reports/expense-summary?${params}`);
      } else if (tab === "collection") {
        const params = new URLSearchParams();
        if (collectionRange.from) params.set("dateFrom", collectionRange.from);
        if (collectionRange.to) params.set("dateTo", collectionRange.to);
        res = await apiGet(`/accounting/reports/collection?${params}`);
      } else if (tab === "balance") {
        const params = new URLSearchParams();
        if (balanceRange.from) params.set("dateFrom", balanceRange.from);
        if (balanceRange.to) params.set("dateTo", balanceRange.to);
        res = await apiGet(`/accounting/reports/account-balance?${params}`);
      } else if (tab === "cashflow") {
        const params = new URLSearchParams();
        if (cashFlowRange.from) params.set("dateFrom", cashFlowRange.from);
        if (cashFlowRange.to) params.set("dateTo", cashFlowRange.to);
        res = await apiGet(`/accounting/reports/cash-flow?${params}`);
      } else if (tab === "sales") {
        const params = new URLSearchParams();
        if (salesRange.from) params.set("dateFrom", salesRange.from);
        if (salesRange.to) params.set("dateTo", salesRange.to);
        if (salesRange.status !== "all") params.set("status", salesRange.status);
        res = await apiGet(`/accounting/reports/sales?${params}`);
      } else if (tab === "costs") {
        const params = new URLSearchParams();
        if (costsRange.from) params.set("dateFrom", costsRange.from);
        if (costsRange.to) params.set("dateTo", costsRange.to);
        res = await apiGet(`/accounting/reports/cost-analysis?${params}`);
      } else if (tab === "annual-payroll") {
        res = await apiGet(`/accounting/reports/annual-payroll?year=${annualPayrollYear}`);
      } else if (tab === "salary-sheet") {
        const params = new URLSearchParams();
        if (salarySheetFilter.month) params.set("month", salarySheetFilter.month);
        if (salarySheetFilter.year) params.set("year", salarySheetFilter.year);
        res = await apiGet(`/accounting/reports/salary-sheet?${params}`);
      } else if (tab === "advance-report") {
        const params = new URLSearchParams();
        if (advanceReportFilter.status !== "all") params.set("status", advanceReportFilter.status);
        res = await apiGet(`/accounting/reports/advance-report?${params}`);
      } else if (tab === "labour-report") {
        const params = new URLSearchParams();
        if (labourRange.from) params.set("dateFrom", labourRange.from);
        if (labourRange.to) params.set("dateTo", labourRange.to);
        res = await apiGet(`/accounting/reports/labour-report?${params}`);
      } else if (tab === "invoice-status") {
        const params = new URLSearchParams();
        if (invoiceStatusRange.from) params.set("dateFrom", invoiceStatusRange.from);
        if (invoiceStatusRange.to) params.set("dateTo", invoiceStatusRange.to);
        res = await apiGet(`/accounting/reports/invoice-status?${params}`);
      } else if (tab === "supplier-ledger") {
        const params = new URLSearchParams();
        if (supplierLedgerFilter.supplierId) params.set("supplierId", supplierLedgerFilter.supplierId);
        if (supplierLedgerFilter.from) params.set("dateFrom", supplierLedgerFilter.from);
        if (supplierLedgerFilter.to) params.set("dateTo", supplierLedgerFilter.to);
        res = await apiGet(`/accounting/reports/supplier-ledger?${params}`);
      } else if (tab === "production-jobs") {
        const params = new URLSearchParams();
        if (productionJobsFilter.from) params.set("dateFrom", productionJobsFilter.from);
        if (productionJobsFilter.to) params.set("dateTo", productionJobsFilter.to);
        if (productionJobsFilter.status !== "all") params.set("status", productionJobsFilter.status);
        res = await apiGet(`/accounting/reports/production-jobs?${params}`);
      } else if (tab === "salary-due") {
        const params = new URLSearchParams();
        if (salaryDueFilter.month) params.set("month", salaryDueFilter.month);
        if (salaryDueFilter.year) params.set("year", salaryDueFilter.year);
        res = await apiGet(`/accounting/reports/salary-due?${params}`);
      }
      setData(res);
    } catch (err: unknown) {
      showToast((err as Error).message || "Failed to load report", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [tab]);

  const exportCSV = (rows: unknown[][], filename: string) => {
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const printReport = () => window.print();

  const tabs: { key: ReportTab; label: string }[] = [
    { key: "pl", label: "Profit & Loss" },
    { key: "monthly", label: "Monthly Trend" },
    { key: "balance", label: "Account Balance" },
    { key: "cashflow", label: "Cash Flow" },
    { key: "sales", label: "Sales Report" },
    { key: "costs", label: "Cost Analysis" },
    { key: "ledger", label: "General Ledger" },
    { key: "expenses", label: "Expense Summary" },
    { key: "collection", label: "Collection" },
    { key: "suppliers", label: "Suppliers" },
    { key: "receivables", label: "Receivables" },
    { key: "payroll", label: "Payroll" },
    { key: "annual-payroll", label: "Annual Payroll" },
    { key: "salary-sheet", label: "Salary Sheet" },
    { key: "advance-report", label: "Advances" },
    { key: "labour-report", label: "Labour" },
    { key: "invoice-status", label: "Invoice Status" },
    { key: "supplier-ledger", label: "Supplier Ledger" },
    { key: "production-jobs", label: "Production Jobs" },
    { key: "salary-due", label: "Salary Due" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-foreground">Financial Reports</h1>
          <p className="text-sm text-muted-foreground">Comprehensive accounting reports</p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
          <div className="flex flex-wrap gap-1.5">
            {tabs.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors cursor-pointer ${tab === t.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                {t.label}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={printReport} className="gap-2 cursor-pointer print:hidden">
            <Printer className="w-4 h-4" /> Print
          </Button>
        </div>

        <div className="flex flex-wrap items-end gap-3 bg-background rounded-xl border border-border p-3 print:hidden">
            {tab === "pl" && (
              <>
                <div className="space-y-1"><p className="text-xs text-muted-foreground">From</p><Input type="date" value={dateRange.from} onChange={e => setDateRange({ ...dateRange, from: e.target.value })} className="w-[150px]" /></div>
                <div className="space-y-1"><p className="text-xs text-muted-foreground">To</p><Input type="date" value={dateRange.to} onChange={e => setDateRange({ ...dateRange, to: e.target.value })} className="w-[150px]" /></div>
              </>
            )}
            {tab === "ledger" && (
              <>
                <div className="space-y-1"><p className="text-xs text-muted-foreground">Account</p><Select value={ledgerFilter.accountId} onChange={val => setLedgerFilter({ ...ledgerFilter, accountId: val})} options={[{ label: "All Accounts", value: "" }, ...accounts.map(a => ({ label: a.name, value: String(a.id) }))]} className="w-[160px]" /></div>
                <div className="space-y-1"><p className="text-xs text-muted-foreground">From</p><Input type="date" value={ledgerFilter.dateFrom} onChange={e => setLedgerFilter({ ...ledgerFilter, dateFrom: e.target.value })} className="w-[150px]" /></div>
                <div className="space-y-1"><p className="text-xs text-muted-foreground">To</p><Input type="date" value={ledgerFilter.dateTo} onChange={e => setLedgerFilter({ ...ledgerFilter, dateTo: e.target.value })} className="w-[150px]" /></div>
              </>
            )}
            {tab === "payroll" && (
              <>
                <div className="space-y-1"><p className="text-xs text-muted-foreground">Month</p><Select value={payrollFilter.month} onChange={val => setPayrollFilter({ ...payrollFilter, month: val})} options={[{ label: "All", value: "" }, ...months.map((m, i) => ({ label: m, value: String(i + 1) }))]} className="w-[120px]" /></div>
                <div className="space-y-1"><p className="text-xs text-muted-foreground">Year</p><Input type="number" value={payrollFilter.year} onChange={e => setPayrollFilter({ ...payrollFilter, year: e.target.value })} min="2020" max="2030" className="w-[100px]" /></div>
              </>
            )}
            {tab === "monthly" && (
              <div className="space-y-1"><p className="text-xs text-muted-foreground">Year</p><Input type="number" value={monthlyYear} onChange={e => setMonthlyYear(e.target.value)} min="2020" max="2030" className="w-[100px]" /></div>
            )}
            {tab === "annual-payroll" && (
              <div className="space-y-1"><p className="text-xs text-muted-foreground">Year</p><Input type="number" value={annualPayrollYear} onChange={e => setAnnualPayrollYear(e.target.value)} min="2020" max="2030" className="w-[100px]" /></div>
            )}
            {(tab === "expenses" || tab === "collection") && (
              <>
                <div className="space-y-1"><p className="text-xs text-muted-foreground">From</p><Input type="date" value={tab === "expenses" ? expenseRange.from : collectionRange.from} onChange={e => tab === "expenses" ? setExpenseRange({ ...expenseRange, from: e.target.value }) : setCollectionRange({ ...collectionRange, from: e.target.value })} className="w-[150px]" /></div>
                <div className="space-y-1"><p className="text-xs text-muted-foreground">To</p><Input type="date" value={tab === "expenses" ? expenseRange.to : collectionRange.to} onChange={e => tab === "expenses" ? setExpenseRange({ ...expenseRange, to: e.target.value }) : setCollectionRange({ ...collectionRange, to: e.target.value })} className="w-[150px]" /></div>
              </>
            )}
            {tab === "cashflow" && (
              <>
                <div className="space-y-1"><p className="text-xs text-muted-foreground">From</p><Input type="date" value={cashFlowRange.from} onChange={e => setCashFlowRange({ ...cashFlowRange, from: e.target.value })} className="w-[150px]" /></div>
                <div className="space-y-1"><p className="text-xs text-muted-foreground">To</p><Input type="date" value={cashFlowRange.to} onChange={e => setCashFlowRange({ ...cashFlowRange, to: e.target.value })} className="w-[150px]" /></div>
              </>
            )}
            {tab === "sales" && (
              <>
                <div className="space-y-1"><p className="text-xs text-muted-foreground">From</p><Input type="date" value={salesRange.from} onChange={e => setSalesRange({ ...salesRange, from: e.target.value })} className="w-[150px]" /></div>
                <div className="space-y-1"><p className="text-xs text-muted-foreground">To</p><Input type="date" value={salesRange.to} onChange={e => setSalesRange({ ...salesRange, to: e.target.value })} className="w-[150px]" /></div>
                <div className="space-y-1"><p className="text-xs text-muted-foreground">Status</p><Select value={salesRange.status} onChange={val => setSalesRange({ ...salesRange, status: val })} options={[{ label: "All", value: "all" }, { label: "Paid", value: "paid" }, { label: "Partial", value: "partial" }, { label: "Unpaid", value: "unpaid" }]} className="w-[120px]" /></div>
              </>
            )}
            {tab === "costs" && (
              <>
                <div className="space-y-1"><p className="text-xs text-muted-foreground">From</p><Input type="date" value={costsRange.from} onChange={e => setCostsRange({ ...costsRange, from: e.target.value })} className="w-[150px]" /></div>
                <div className="space-y-1"><p className="text-xs text-muted-foreground">To</p><Input type="date" value={costsRange.to} onChange={e => setCostsRange({ ...costsRange, to: e.target.value })} className="w-[150px]" /></div>
              </>
            )}
            {tab === "salary-sheet" && (
              <>
                <div className="space-y-1"><p className="text-xs text-muted-foreground">Month</p><Select value={salarySheetFilter.month} onChange={val => setSalarySheetFilter({ ...salarySheetFilter, month: val})} options={[{ label: "All Months", value: "" }, ...months.map((m, i) => ({ label: m, value: String(i + 1) }))]} className="w-[130px]" /></div>
                <div className="space-y-1"><p className="text-xs text-muted-foreground">Year</p><Input type="number" value={salarySheetFilter.year} onChange={e => setSalarySheetFilter({ ...salarySheetFilter, year: e.target.value })} min="2020" max="2030" className="w-[100px]" /></div>
              </>
            )}
            {tab === "advance-report" && (
              <div className="space-y-1"><p className="text-xs text-muted-foreground">Status</p><Select value={advanceReportFilter.status} onChange={val => setAdvanceReportFilter({ status: val })} options={[{ label: "All", value: "all" }, { label: "Outstanding", value: "outstanding" }, { label: "Cleared", value: "cleared" }]} className="w-[140px]" /></div>
            )}
            {(tab === "labour-report" || tab === "invoice-status") && (
              <>
                <div className="space-y-1"><p className="text-xs text-muted-foreground">From</p><Input type="date" value={tab === "labour-report" ? labourRange.from : invoiceStatusRange.from} onChange={e => tab === "labour-report" ? setLabourRange({ ...labourRange, from: e.target.value }) : setInvoiceStatusRange({ ...invoiceStatusRange, from: e.target.value })} className="w-[150px]" /></div>
                <div className="space-y-1"><p className="text-xs text-muted-foreground">To</p><Input type="date" value={tab === "labour-report" ? labourRange.to : invoiceStatusRange.to} onChange={e => tab === "labour-report" ? setLabourRange({ ...labourRange, to: e.target.value }) : setInvoiceStatusRange({ ...invoiceStatusRange, to: e.target.value })} className="w-[150px]" /></div>
              </>
            )}
            {tab === "suppliers" && (
              <>
                <div className="space-y-1"><p className="text-xs text-muted-foreground">From</p><Input type="date" value={supplierRange.from} onChange={e => setSupplierRange({ ...supplierRange, from: e.target.value })} className="w-[150px]" /></div>
                <div className="space-y-1"><p className="text-xs text-muted-foreground">To</p><Input type="date" value={supplierRange.to} onChange={e => setSupplierRange({ ...supplierRange, to: e.target.value })} className="w-[150px]" /></div>
              </>
            )}
            {tab === "receivables" && (
              <>
                <div className="space-y-1"><p className="text-xs text-muted-foreground">From</p><Input type="date" value={receivableRange.from} onChange={e => setReceivableRange({ ...receivableRange, from: e.target.value })} className="w-[150px]" /></div>
                <div className="space-y-1"><p className="text-xs text-muted-foreground">To</p><Input type="date" value={receivableRange.to} onChange={e => setReceivableRange({ ...receivableRange, to: e.target.value })} className="w-[150px]" /></div>
                <div className="space-y-1"><p className="text-xs text-muted-foreground">Status</p><Select value={receivableRange.status} onChange={val => setReceivableRange({ ...receivableRange, status: val })} options={[{ label: "Outstanding", value: "outstanding" }, { label: "All", value: "all" }, { label: "Paid", value: "paid" }]} className="w-[140px]" /></div>
              </>
            )}
            {tab === "balance" && (
              <>
                <div className="space-y-1"><p className="text-xs text-muted-foreground">From (period)</p><Input type="date" value={balanceRange.from} onChange={e => setBalanceRange({ ...balanceRange, from: e.target.value })} className="w-[150px]" /></div>
                <div className="space-y-1"><p className="text-xs text-muted-foreground">To (period)</p><Input type="date" value={balanceRange.to} onChange={e => setBalanceRange({ ...balanceRange, to: e.target.value })} className="w-[150px]" /></div>
              </>
            )}
            {tab === "supplier-ledger" && (
              <>
                <div className="space-y-1"><p className="text-xs text-muted-foreground">Supplier</p><Select value={supplierLedgerFilter.supplierId} onChange={val => setSupplierLedgerFilter({ ...supplierLedgerFilter, supplierId: val })} options={[{ label: "All Suppliers", value: "" }, ...supplierList.map(s => ({ label: s.name, value: String(s.id) }))]} className="w-[180px]" /></div>
                <div className="space-y-1"><p className="text-xs text-muted-foreground">From</p><Input type="date" value={supplierLedgerFilter.from} onChange={e => setSupplierLedgerFilter({ ...supplierLedgerFilter, from: e.target.value })} className="w-[150px]" /></div>
                <div className="space-y-1"><p className="text-xs text-muted-foreground">To</p><Input type="date" value={supplierLedgerFilter.to} onChange={e => setSupplierLedgerFilter({ ...supplierLedgerFilter, to: e.target.value })} className="w-[150px]" /></div>
              </>
            )}
            {tab === "production-jobs" && (
              <>
                <div className="space-y-1"><p className="text-xs text-muted-foreground">From</p><Input type="date" value={productionJobsFilter.from} onChange={e => setProductionJobsFilter({ ...productionJobsFilter, from: e.target.value })} className="w-[150px]" /></div>
                <div className="space-y-1"><p className="text-xs text-muted-foreground">To</p><Input type="date" value={productionJobsFilter.to} onChange={e => setProductionJobsFilter({ ...productionJobsFilter, to: e.target.value })} className="w-[150px]" /></div>
                <div className="space-y-1"><p className="text-xs text-muted-foreground">Status</p><Select value={productionJobsFilter.status} onChange={val => setProductionJobsFilter({ ...productionJobsFilter, status: val })} options={[{ label: "All", value: "all" }, { label: "Active", value: "active" }, { label: "Completed", value: "completed" }, { label: "Cancelled", value: "cancelled" }]} className="w-[130px]" /></div>
              </>
            )}
            {tab === "salary-due" && (
              <>
                <div className="space-y-1"><p className="text-xs text-muted-foreground">Month</p><Select value={salaryDueFilter.month} onChange={val => setSalaryDueFilter({ ...salaryDueFilter, month: val })} options={months.map((m, i) => ({ label: m, value: String(i + 1) }))} className="w-[120px]" /></div>
                <div className="space-y-1"><p className="text-xs text-muted-foreground">Year</p><Input type="number" value={salaryDueFilter.year} onChange={e => setSalaryDueFilter({ ...salaryDueFilter, year: e.target.value })} min="2020" max="2030" className="w-[100px]" /></div>
              </>
            )}
            <Button size="sm" onClick={load} className="cursor-pointer">Apply</Button>
          </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
        ) : !data ? null : tab === "pl" ? (
          <PLReport data={data as unknown as PLData} onExport={exportCSV} />
        ) : tab === "ledger" ? (
          <LedgerReport data={data as unknown as LedgerData} onExport={exportCSV} />
        ) : tab === "suppliers" ? (
          <SupplierReport data={data as unknown as SupplierData} onExport={exportCSV} />
        ) : tab === "receivables" ? (
          <ReceivableReport data={data as unknown as ReceivableData} onExport={exportCSV} />
        ) : tab === "payroll" ? (
          <PayrollReport data={data as unknown as PayrollData} onExport={exportCSV} />
        ) : tab === "monthly" ? (
          <MonthlyReport data={data as unknown as MonthlyData} onExport={exportCSV} />
        ) : tab === "expenses" ? (
          <ExpenseSummaryReport data={data as unknown as ExpenseSummaryData} onExport={exportCSV} />
        ) : tab === "collection" ? (
          <CollectionReport data={data as unknown as CollectionData} onExport={exportCSV} />
        ) : tab === "balance" ? (
          <AccountBalanceReport data={data as unknown as AccountBalanceData} onExport={exportCSV} />
        ) : tab === "cashflow" ? (
          <CashFlowReport data={data as unknown as CashFlowData} onExport={exportCSV} />
        ) : tab === "sales" ? (
          <SalesReport data={data as unknown as SalesData} onExport={exportCSV} />
        ) : tab === "costs" ? (
          <CostAnalysisReport data={data as unknown as CostAnalysisData} onExport={exportCSV} />
        ) : tab === "annual-payroll" ? (
          <AnnualPayrollReport data={data as unknown as AnnualPayrollData} onExport={exportCSV} />
        ) : tab === "salary-sheet" ? (
          <SalarySheetReport data={data as unknown as SalarySheetData} onExport={exportCSV} />
        ) : tab === "advance-report" ? (
          <AdvanceReportComp data={data as unknown as AdvanceReportData} onExport={exportCSV} />
        ) : tab === "labour-report" ? (
          <LabourReportComp data={data as unknown as LabourReportData} onExport={exportCSV} />
        ) : tab === "invoice-status" ? (
          <InvoiceStatusReport data={data as unknown as InvoiceStatusData} onExport={exportCSV} />
        ) : tab === "supplier-ledger" ? (
          <SupplierLedgerReport data={data as unknown as SupplierLedgerData} onExport={exportCSV} />
        ) : tab === "production-jobs" ? (
          <ProductionJobsReport data={data as unknown as ProductionJobsData} onExport={exportCSV} />
        ) : tab === "salary-due" ? (
          <SalaryDueReport data={data as unknown as SalaryDueData} onExport={exportCSV} />
        ) : null}
      </div>
    </DashboardLayout>
  );
}

interface PLData {
  from: string; to: string;
  revenue: number; expenses: number; expenseBreakdown: Array<{ category: string; amount: number }>;
  supplierPurchases: number; labourPayments: number; salaries: number; vendorPayments: number;
  totalCosts: number; netProfit: number;
}

function PLReport({ data, onExport }: { data: PLData; onExport: (rows: unknown[][], file: string) => void }) {
  if (!data) return <div className="py-16 text-center text-muted-foreground">No data available.</div>;
  const rows: [string, string][] = [
    ["Item", "Amount (Rs)"],
    ["Revenue (Payments Received)", String(data.revenue)],
    ["—", "—"],
    ["Supplier Purchases", String(data.supplierPurchases)],
    ...data.expenseBreakdown.map(e => [`Expense: ${e.category}`, String(e.amount)] as [string, string]),
    ["Labour Payments", String(data.labourPayments)],
    ["Salaries", String(data.salaries)],
    ["Vendor Payments (Outsource)", String(data.vendorPayments || 0)],
    ["Total Costs", String(data.totalCosts)],
    ["Net Profit / Loss", String(data.netProfit)],
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{new Date(data.from).toLocaleDateString()} — {new Date(data.to).toLocaleDateString()}</p>
        <Button variant="outline" size="sm" onClick={() => onExport(rows, "profit-loss.csv")} className="gap-2 cursor-pointer"><Download className="w-4 h-4" /> Export CSV</Button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatBox label="Revenue" value={`Rs ${fmt(data.revenue)}`} color="text-emerald-600" />
        <StatBox label="Total Costs" value={`Rs ${fmt(data.totalCosts)}`} color="text-red-600" />
        <StatBox label="Net Profit" value={`Rs ${fmt(data.netProfit)}`} color={data.netProfit >= 0 ? "text-emerald-600" : "text-red-600"} />
      </div>
      <div className="bg-background rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b border-border">
            <tr><th className="text-left px-4 py-3 font-medium text-muted-foreground">Item</th><th className="text-right px-4 py-3 font-medium text-muted-foreground">Amount</th><th className="text-right px-4 py-3 font-medium text-muted-foreground">% of Revenue</th></tr>
          </thead>
          <tbody className="divide-y divide-border">
            <tr className="bg-emerald-50/50"><td className="px-4 py-3 font-semibold">Revenue (Payments Received)</td><td className="px-4 py-3 text-right font-bold text-emerald-600">Rs {fmt(data.revenue)}</td><td className="px-4 py-3 text-right">100%</td></tr>
            <tr><td className="px-4 py-3 text-muted-foreground pl-6">Supplier Purchases</td><td className="px-4 py-3 text-right text-red-500">Rs {fmt(data.supplierPurchases)}</td><td className="px-4 py-3 text-right text-muted-foreground">{pct(data.supplierPurchases, data.revenue)}</td></tr>
            {data.expenseBreakdown.map(e => (
              <tr key={e.category}><td className="px-4 py-3 text-muted-foreground pl-6">{e.category}</td><td className="px-4 py-3 text-right text-red-500">Rs {fmt(e.amount)}</td><td className="px-4 py-3 text-right text-muted-foreground">{pct(e.amount, data.revenue)}</td></tr>
            ))}
            <tr><td className="px-4 py-3 text-muted-foreground pl-6">Labour Payments</td><td className="px-4 py-3 text-right text-red-500">Rs {fmt(data.labourPayments)}</td><td className="px-4 py-3 text-right text-muted-foreground">{pct(data.labourPayments, data.revenue)}</td></tr>
            <tr><td className="px-4 py-3 text-muted-foreground pl-6">Salaries</td><td className="px-4 py-3 text-right text-red-500">Rs {fmt(data.salaries)}</td><td className="px-4 py-3 text-right text-muted-foreground">{pct(data.salaries, data.revenue)}</td></tr>
            {(data.vendorPayments || 0) > 0 && <tr><td className="px-4 py-3 text-muted-foreground pl-6">Vendor Payments (Outsource)</td><td className="px-4 py-3 text-right text-red-500">Rs {fmt(data.vendorPayments || 0)}</td><td className="px-4 py-3 text-right text-muted-foreground">{pct(data.vendorPayments || 0, data.revenue)}</td></tr>}
            <tr className="border-t-2 border-border bg-muted/20"><td className="px-4 py-3 font-semibold">Total Costs</td><td className="px-4 py-3 text-right font-bold text-red-600">Rs {fmt(data.totalCosts)}</td><td className="px-4 py-3 text-right text-muted-foreground">{pct(data.totalCosts, data.revenue)}</td></tr>
            <tr className={data.netProfit >= 0 ? "bg-emerald-50/50" : "bg-red-50/50"}><td className="px-4 py-3 font-bold">Net {data.netProfit >= 0 ? "Profit" : "Loss"}</td><td className={`px-4 py-3 text-right font-bold text-xl ${data.netProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>Rs {fmt(Math.abs(data.netProfit))}</td><td className="px-4 py-3 text-right text-muted-foreground">{pct(Math.abs(data.netProfit), data.revenue)}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface LedgerData {
  entries: Array<{ date: string; type: string; category: string; account: string; description: string; amount: number }>;
  totalIn: number; totalOut: number; net: number;
}

function LedgerReport({ data, onExport }: { data: LedgerData; onExport: (rows: unknown[][], file: string) => void }) {
  if (!data?.entries) return <div className="py-16 text-center text-muted-foreground">No data available.</div>;
  const csvRows = [
    ["Date", "Type", "Category", "Account", "Description", "Amount"],
    ...data.entries.map(e => [new Date(e.date).toLocaleDateString(), e.type, e.category, e.account || "", e.description, e.amount]),
  ];
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="grid grid-cols-3 gap-4">
          <StatBox label="Total In" value={`Rs ${fmt(data.totalIn)}`} color="text-emerald-600" />
          <StatBox label="Total Out" value={`Rs ${fmt(data.totalOut)}`} color="text-red-600" />
          <StatBox label="Net" value={`Rs ${fmt(data.net)}`} color={data.net >= 0 ? "text-emerald-600" : "text-red-600"} />
        </div>
        <Button variant="outline" size="sm" onClick={() => onExport(csvRows, "ledger.csv")} className="gap-2 cursor-pointer"><Download className="w-4 h-4" /> Export CSV</Button>
      </div>
      {data.entries.length === 0 ? <div className="text-center py-12 text-muted-foreground">No transactions in this range.</div> : (
        <div className="bg-background rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Category</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Description</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Account</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.entries.map((e, i) => (
                <tr key={i} className="hover:bg-muted/30">
                  <td className="px-4 py-2.5 text-muted-foreground text-xs whitespace-nowrap">{new Date(e.date).toLocaleDateString()}</td>
                  <td className="px-4 py-2.5"><span className={`text-xs px-2 py-0.5 rounded-full ${e.type === "IN" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>{e.type}</span></td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs">{e.category}</td>
                  <td className="px-4 py-2.5 text-sm">{e.description}</td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs">{e.account || "—"}</td>
                  <td className={`px-4 py-2.5 text-right font-semibold ${e.type === "IN" ? "text-emerald-600" : "text-red-600"}`}>Rs {fmt(e.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

interface SupplierData { suppliers: Array<{ id: number; name: string; phone: string; totalPurchased: number; totalPaid: number; balance: number }>; }

function SupplierReport({ data, onExport }: { data: SupplierData; onExport: (rows: unknown[][], file: string) => void }) {
  if (!data?.suppliers) return <div className="py-16 text-center text-muted-foreground">No data available.</div>;
  const csvRows = [
    ["Supplier", "Phone", "Total Purchased", "Total Paid", "Balance"],
    ...data.suppliers.map(s => [s.name, s.phone || "", s.totalPurchased, s.totalPaid, s.balance]),
  ];
  const totalDebt = data.suppliers.reduce((s, sup) => s + sup.balance, 0);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <StatBox label="Total Supplier Debt" value={`Rs ${fmt(totalDebt)}`} color={totalDebt > 0 ? "text-red-600" : "text-emerald-600"} />
        <Button variant="outline" size="sm" onClick={() => onExport(csvRows, "supplier-balances.csv")} className="gap-2 cursor-pointer"><Download className="w-4 h-4" /> Export CSV</Button>
      </div>
      <div className="bg-background rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b border-border"><tr>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Supplier</th>
            <th className="text-right px-4 py-3 font-medium text-muted-foreground">Purchased</th>
            <th className="text-right px-4 py-3 font-medium text-muted-foreground">Paid</th>
            <th className="text-right px-4 py-3 font-medium text-muted-foreground">Balance</th>
          </tr></thead>
          <tbody className="divide-y divide-border">
            {data.suppliers.map(s => (
              <tr key={s.id} className="hover:bg-muted/30">
                <td className="px-4 py-3"><p className="font-medium">{s.name}</p>{s.phone && <p className="text-xs text-muted-foreground">{s.phone}</p>}</td>
                <td className="px-4 py-3 text-right">Rs {fmt(s.totalPurchased)}</td>
                <td className="px-4 py-3 text-right text-emerald-600">Rs {fmt(s.totalPaid)}</td>
                <td className={`px-4 py-3 text-right font-bold ${s.balance > 0 ? "text-red-600" : "text-emerald-600"}`}>Rs {fmt(s.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface ReceivableData {
  invoices: Array<{ id: number; invoiceNo: string; customer: string; phone: string; invoiceDate: string; totalAmount: number; discount: number; paidAmount: number; balance: number; status: string }>;
}

function ReceivableReport({ data, onExport }: { data: ReceivableData; onExport: (rows: unknown[][], file: string) => void }) {
  if (!data?.invoices) return <div className="py-16 text-center text-muted-foreground">No data available.</div>;
  const csvRows = [
    ["Invoice", "Customer", "Phone", "Date", "Total", "Paid", "Balance", "Status"],
    ...data.invoices.map(i => [i.invoiceNo, i.customer, i.phone || "", new Date(i.invoiceDate).toLocaleDateString(), i.totalAmount - i.discount, i.paidAmount, i.balance, i.status]),
  ];
  const totalPending = data.invoices.reduce((s, i) => s + i.balance, 0);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <StatBox label="Total Receivable" value={`Rs ${fmt(totalPending)}`} color="text-amber-600" />
        <Button variant="outline" size="sm" onClick={() => onExport(csvRows, "receivables.csv")} className="gap-2 cursor-pointer"><Download className="w-4 h-4" /> Export CSV</Button>
      </div>
      {data.invoices.length === 0 ? <div className="text-center py-12 text-muted-foreground">No pending receivables.</div> : (
        <div className="bg-background rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border"><tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Invoice</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Customer</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Total</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Paid</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Balance</th>
            </tr></thead>
            <tbody className="divide-y divide-border">
              {data.invoices.map(inv => (
                <tr key={inv.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{inv.invoiceNo}</td>
                  <td className="px-4 py-3"><p>{inv.customer}</p>{inv.phone && <p className="text-xs text-muted-foreground">{inv.phone}</p>}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(inv.invoiceDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">Rs {fmt(inv.totalAmount - inv.discount)}</td>
                  <td className="px-4 py-3 text-right text-emerald-600">Rs {fmt(inv.paidAmount)}</td>
                  <td className="px-4 py-3 text-right font-bold text-amber-600">Rs {fmt(inv.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

interface PayrollData {
  salaries: Array<{ id: number; employee: { name: string; designation?: string }; month: number; year: number; baseSalary: number; advanceDeducted: number; netSalary: number; isPaid: boolean }>;
  advances: Array<{ id: number; employee: { name: string }; amount: number; repaid: number }>;
  labour: Array<{ id: number; workerName: string; amount: number; paymentDate: string }>;
  totalSalaries: number; totalAdvances: number; totalRepaid: number; outstandingAdvances: number; totalLabour: number;
}

function PayrollReport({ data, onExport }: { data: PayrollData; onExport: (rows: unknown[][], file: string) => void }) {
  if (!data?.salaries) return <div className="py-16 text-center text-muted-foreground">No data available.</div>;
  const csvRows = [
    ["Type", "Employee/Worker", "Period", "Amount", "Notes"],
    ...data.salaries.map(s => ["Salary", s.employee.name, `${months[s.month - 1]} ${s.year}`, s.netSalary, s.isPaid ? "Paid" : "Unpaid"]),
    ...data.labour.map(l => ["Labour", l.workerName, new Date(l.paymentDate).toLocaleDateString(), l.amount, ""]),
    ...data.advances.map(a => ["Advance", a.employee.name, "", a.amount, `Repaid: ${a.repaid}`]),
  ];
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1 mr-4">
          <StatBox label="Total Salaries" value={`Rs ${fmt(data.totalSalaries)}`} color="text-blue-600" />
          <StatBox label="Total Labour" value={`Rs ${fmt(data.totalLabour)}`} color="text-purple-600" />
          <StatBox label="Advances Given" value={`Rs ${fmt(data.totalAdvances)}`} color="text-amber-600" />
          <StatBox label="Outstanding Advances" value={`Rs ${fmt(data.outstandingAdvances)}`} color={data.outstandingAdvances > 0 ? "text-red-600" : "text-emerald-600"} />
        </div>
        <Button variant="outline" size="sm" onClick={() => onExport(csvRows, "payroll-report.csv")} className="gap-2 cursor-pointer print:hidden shrink-0"><Download className="w-4 h-4" /> Export CSV</Button>
      </div>
      {data.salaries.length > 0 && (
        <div>
          <p className="text-sm font-semibold mb-2">Salary Records</p>
          <div className="bg-background rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border"><tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Employee</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Period</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Base</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Deducted</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Net</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">Status</th>
              </tr></thead>
              <tbody className="divide-y divide-border">
                {data.salaries.map(s => (
                  <tr key={s.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3"><p className="font-medium">{s.employee.name}</p>{s.employee.designation && <p className="text-xs text-muted-foreground">{s.employee.designation}</p>}</td>
                    <td className="px-4 py-3 text-muted-foreground">{months[s.month - 1]} {s.year}</td>
                    <td className="px-4 py-3 text-right">Rs {fmt(s.baseSalary)}</td>
                    <td className="px-4 py-3 text-right text-red-500">Rs {fmt(s.advanceDeducted)}</td>
                    <td className="px-4 py-3 text-right font-bold">Rs {fmt(s.netSalary)}</td>
                    <td className="px-4 py-3 text-center"><span className={`text-xs px-2 py-0.5 rounded-full ${s.isPaid ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{s.isPaid ? "Paid" : "Unpaid"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {data.labour.length > 0 && (
        <div>
          <p className="text-sm font-semibold mb-2">Labour Payments (Rs {fmt(data.totalLabour)} total)</p>
          <div className="bg-background rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border"><tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Worker</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Amount</th>
              </tr></thead>
              <tbody className="divide-y divide-border">
                {data.labour.map(l => (
                  <tr key={l.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 text-muted-foreground">{new Date(l.paymentDate).toLocaleDateString()}</td>
                    <td className="px-4 py-3 font-medium">{l.workerName}</td>
                    <td className="px-4 py-3 text-right font-semibold">Rs {fmt(l.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

interface AccountBalanceData {
  accounts: Array<{ id: number; name: string; type: string; openingBalance: number; totalInflow: number; totalOutflow: number; balance: number; breakdown: { invoiceReceipts: number; transfersIn: number; expenses: number; supplierPayments: number; transfersOut: number; advances: number; salaries: number; labour: number } }>;
  totalBalance: number; totalInflow: number; totalOutflow: number;
}

function AccountBalanceReport({ data, onExport }: { data: AccountBalanceData; onExport: (rows: unknown[][], file: string) => void }) {
  if (!data?.accounts) return <div className="py-16 text-center text-muted-foreground">No data available.</div>;
  const csvRows = [
    ["Account", "Type", "Opening Balance", "Total Inflow", "Total Outflow", "Balance"],
    ...data.accounts.map(a => [a.name, a.type, a.openingBalance, a.totalInflow, a.totalOutflow, a.balance]),
  ];
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-3">
          <StatBox label="Total Balance" value={`Rs ${fmt(data.totalBalance)}`} color={data.totalBalance >= 0 ? "text-emerald-600" : "text-red-600"} />
          <StatBox label="Total Inflow" value={`Rs ${fmt(data.totalInflow)}`} color="text-emerald-600" />
          <StatBox label="Total Outflow" value={`Rs ${fmt(data.totalOutflow)}`} color="text-red-600" />
        </div>
        <Button variant="outline" size="sm" onClick={() => onExport(csvRows, "account-balance.csv")} className="gap-2 cursor-pointer print:hidden"><Download className="w-4 h-4" /> Export CSV</Button>
      </div>
      <div className="grid gap-4">
        {data.accounts.map(acc => (
          <div key={acc.id} className="bg-background rounded-xl border border-border overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/20">
              <div><p className="font-semibold">{acc.name}</p><p className="text-xs text-muted-foreground capitalize">{acc.type} · Opening: Rs {fmt(acc.openingBalance)}</p></div>
              <p className={`text-xl font-bold ${acc.balance >= 0 ? "text-emerald-600" : "text-red-600"}`}>Rs {fmt(acc.balance)}</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border">
              {[
                { label: "Invoice Receipts", v: acc.breakdown.invoiceReceipts, positive: true },
                { label: "Transfers In", v: acc.breakdown.transfersIn, positive: true },
                { label: "Expenses", v: acc.breakdown.expenses, positive: false },
                { label: "Supplier Pmts", v: acc.breakdown.supplierPayments, positive: false },
                { label: "Transfers Out", v: acc.breakdown.transfersOut, positive: false },
                { label: "Advances", v: acc.breakdown.advances, positive: false },
                { label: "Salaries", v: acc.breakdown.salaries, positive: false },
                { label: "Labour", v: acc.breakdown.labour, positive: false },
              ].map((item, i) => (
                <div key={i} className="bg-background px-3 py-2">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className={`text-sm font-semibold mt-0.5 ${item.positive ? "text-emerald-600" : "text-red-600"}`}>Rs {fmt(item.v)}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface CashFlowData {
  from: string; to: string;
  inflows: Array<{ label: string; amount: number }>;
  outflows: Array<{ label: string; amount: number }>;
  totalIn: number; totalOut: number; netCashFlow: number;
}

function CashFlowReport({ data, onExport }: { data: CashFlowData; onExport: (rows: unknown[][], file: string) => void }) {
  if (!data?.inflows) return <div className="py-16 text-center text-muted-foreground">No data available.</div>;
  const csvRows = [
    ["Type", "Category", "Amount"],
    ...data.inflows.map(i => ["Inflow", i.label, i.amount]),
    ...data.outflows.map(o => ["Outflow", o.label, o.amount]),
    ["", "Net Cash Flow", data.netCashFlow],
  ];
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-3">
          <StatBox label="Total Inflow" value={`Rs ${fmt(data.totalIn)}`} color="text-emerald-600" />
          <StatBox label="Total Outflow" value={`Rs ${fmt(data.totalOut)}`} color="text-red-600" />
          <StatBox label="Net Cash Flow" value={`Rs ${fmt(data.netCashFlow)}`} color={data.netCashFlow >= 0 ? "text-emerald-600" : "text-red-600"} />
        </div>
        <Button variant="outline" size="sm" onClick={() => onExport(csvRows, "cash-flow.csv")} className="gap-2 cursor-pointer print:hidden"><Download className="w-4 h-4" /> Export CSV</Button>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <p className="text-sm font-semibold text-emerald-600 mb-2">Cash Inflows</p>
          <div className="bg-background rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm"><tbody className="divide-y divide-border">
              {data.inflows.map((item, i) => <tr key={i} className="hover:bg-muted/20"><td className="px-4 py-2.5">{item.label}</td><td className="px-4 py-2.5 text-right font-semibold text-emerald-600">Rs {fmt(item.amount)}</td></tr>)}
              <tr className="bg-muted/20 border-t-2 border-border"><td className="px-4 py-2.5 font-bold">Total</td><td className="px-4 py-2.5 text-right font-bold text-emerald-600">Rs {fmt(data.totalIn)}</td></tr>
            </tbody></table>
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold text-red-600 mb-2">Cash Outflows</p>
          <div className="bg-background rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm"><tbody className="divide-y divide-border">
              {data.outflows.map((item, i) => <tr key={i} className="hover:bg-muted/20"><td className="px-4 py-2.5">{item.label}</td><td className="px-4 py-2.5 text-right font-semibold text-red-600">Rs {fmt(item.amount)}</td></tr>)}
              <tr className="bg-muted/20 border-t-2 border-border"><td className="px-4 py-2.5 font-bold">Total</td><td className="px-4 py-2.5 text-right font-bold text-red-600">Rs {fmt(data.totalOut)}</td></tr>
            </tbody></table>
          </div>
        </div>
      </div>
    </div>
  );
}

interface SalesData {
  from: string; to: string; totalSales: number; totalCollected: number; totalPending: number; totalDiscount: number; invoiceCount: number;
  invoices: Array<{ id: number; invoiceNo: string; invoiceDate: string; customer: string; phone: string; totalAmount: number; discount: number; netAmount: number; paidAmount: number; balance: number; status: string }>;
}

function SalesReport({ data, onExport }: { data: SalesData; onExport: (rows: unknown[][], file: string) => void }) {
  if (!data?.invoices) return <div className="py-16 text-center text-muted-foreground">No data available.</div>;
  const statusColor = (s: string) => s === "paid" ? "text-emerald-600 bg-emerald-50" : s === "partial" ? "text-amber-600 bg-amber-50" : "text-red-600 bg-red-50";
  const csvRows = [
    ["Invoice No", "Date", "Customer", "Amount", "Discount", "Net", "Paid", "Balance", "Status"],
    ...data.invoices.map(inv => [inv.invoiceNo, new Date(inv.invoiceDate).toLocaleDateString(), inv.customer, inv.totalAmount, inv.discount, inv.netAmount, inv.paidAmount, inv.balance, inv.status]),
  ];
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <StatBox label="Total Sales" value={`Rs ${fmt(data.totalSales)}`} color="text-foreground" />
          <StatBox label="Collected" value={`Rs ${fmt(data.totalCollected)}`} color="text-emerald-600" />
          <StatBox label="Pending" value={`Rs ${fmt(data.totalPending)}`} color="text-red-600" />
          <StatBox label="Discounts" value={`Rs ${fmt(data.totalDiscount)}`} color="text-amber-600" />
          <StatBox label="Invoices" value={String(data.invoiceCount)} color="text-blue-600" />
        </div>
        <Button variant="outline" size="sm" onClick={() => onExport(csvRows, "sales-report.csv")} className="gap-2 cursor-pointer print:hidden"><Download className="w-4 h-4" /> Export CSV</Button>
      </div>
      <div className="bg-background rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b border-border"><tr>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Invoice</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Customer</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
            <th className="text-right px-4 py-3 font-medium text-muted-foreground">Net Amount</th>
            <th className="text-right px-4 py-3 font-medium text-muted-foreground">Paid</th>
            <th className="text-right px-4 py-3 font-medium text-muted-foreground">Balance</th>
            <th className="text-center px-4 py-3 font-medium text-muted-foreground">Status</th>
          </tr></thead>
          <tbody className="divide-y divide-border">
            {data.invoices.map(inv => (
              <tr key={inv.id} className="hover:bg-muted/30">
                <td className="px-4 py-2.5 font-medium">{inv.invoiceNo}</td>
                <td className="px-4 py-2.5">{inv.customer}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{new Date(inv.invoiceDate).toLocaleDateString()}</td>
                <td className="px-4 py-2.5 text-right">Rs {fmt(inv.netAmount)}</td>
                <td className="px-4 py-2.5 text-right text-emerald-600">Rs {fmt(inv.paidAmount)}</td>
                <td className={`px-4 py-2.5 text-right font-semibold ${inv.balance > 0 ? "text-red-600" : "text-emerald-600"}`}>Rs {fmt(inv.balance)}</td>
                <td className="px-4 py-2.5 text-center"><span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${statusColor(inv.status)}`}>{inv.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.invoices.length === 0 && <p className="text-center py-10 text-muted-foreground">No invoices in this period</p>}
      </div>
    </div>
  );
}

interface CostAnalysisData {
  from: string; to: string; grandTotal: number;
  summary: Array<{ type: string; amount: number; pct: number }>;
  expensesByCategory: Array<{ category: string; amount: number; count: number; pct: number }>;
  purchasesBySupplier: Array<{ supplier: string; amount: number; count: number }>;
  vendorPaymentsByVendor: Array<{ vendor: string; amount: number; count: number }>;
  expenseDetails: Array<{ date: string; description: string; category: string; account: string; amount: number; billImage: string | null }>;
}

function CostAnalysisReport({ data, onExport }: { data: CostAnalysisData; onExport: (rows: unknown[][], file: string) => void }) {
  const [showDetails, setShowDetails] = React.useState(false);
  if (!data?.summary) return <div className="py-16 text-center text-muted-foreground">No data available.</div>;
  const csvRows = [
    ["Type", "Amount", "%"],
    ...data.summary.map(s => [s.type, s.amount, s.pct + "%"]),
    ["", "", ""],
    ["Expense Category", "Amount", "Transactions"],
    ...data.expensesByCategory.map(e => [e.category, e.amount, e.count]),
    ["", "", ""],
    ["Supplier", "Purchases", "Transactions"],
    ...data.purchasesBySupplier.map(p => [p.supplier, p.amount, p.count]),
  ];
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <StatBox label="Total Costs" value={`Rs ${fmt(data.grandTotal)}`} color="text-red-600" />
        <Button variant="outline" size="sm" onClick={() => onExport(csvRows, "cost-analysis.csv")} className="gap-2 cursor-pointer print:hidden"><Download className="w-4 h-4" /> Export CSV</Button>
      </div>
      <div className="bg-background rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b border-border"><tr><th className="text-left px-4 py-3 font-medium text-muted-foreground">Cost Type</th><th className="text-right px-4 py-3 font-medium text-muted-foreground">Amount</th><th className="text-right px-4 py-3 font-medium text-muted-foreground">%</th></tr></thead>
          <tbody className="divide-y divide-border">
            {data.summary.map((s, i) => <tr key={i} className="hover:bg-muted/30"><td className="px-4 py-2.5 font-medium">{s.type}</td><td className="px-4 py-2.5 text-right font-semibold text-red-600">Rs {fmt(s.amount)}</td><td className="px-4 py-2.5 text-right text-muted-foreground">{s.pct}%</td></tr>)}
          </tbody>
        </table>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <p className="text-sm font-semibold mb-2">Expenses by Category</p>
          <div className="bg-background rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm"><thead className="bg-muted/30 border-b border-border"><tr><th className="text-left px-3 py-2 font-medium text-muted-foreground">Category</th><th className="text-right px-3 py-2 font-medium text-muted-foreground">Amount</th><th className="text-right px-3 py-2 font-medium text-muted-foreground">%</th></tr></thead>
              <tbody className="divide-y divide-border">
                {data.expensesByCategory.map((e, i) => <tr key={i} className="hover:bg-muted/20"><td className="px-3 py-2">{e.category}</td><td className="px-3 py-2 text-right font-semibold">Rs {fmt(e.amount)}</td><td className="px-3 py-2 text-right text-muted-foreground">{e.pct}%</td></tr>)}
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold mb-2">Purchases by Supplier</p>
          <div className="bg-background rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm"><thead className="bg-muted/30 border-b border-border"><tr><th className="text-left px-3 py-2 font-medium text-muted-foreground">Supplier</th><th className="text-right px-3 py-2 font-medium text-muted-foreground">Amount</th><th className="text-right px-3 py-2 font-medium text-muted-foreground">Txns</th></tr></thead>
              <tbody className="divide-y divide-border">
                {data.purchasesBySupplier.map((p, i) => <tr key={i} className="hover:bg-muted/20"><td className="px-3 py-2">{p.supplier}</td><td className="px-3 py-2 text-right font-semibold">Rs {fmt(p.amount)}</td><td className="px-3 py-2 text-right text-muted-foreground">{p.count}</td></tr>)}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {data.vendorPaymentsByVendor && data.vendorPaymentsByVendor.length > 0 && (
        <div>
          <p className="text-sm font-semibold mb-2">Vendor Payments by Vendor (Outsource)</p>
          <div className="bg-background rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm"><thead className="bg-muted/30 border-b border-border"><tr><th className="text-left px-3 py-2 font-medium text-muted-foreground">Vendor</th><th className="text-right px-3 py-2 font-medium text-muted-foreground">Amount Paid</th><th className="text-right px-3 py-2 font-medium text-muted-foreground">Txns</th></tr></thead>
              <tbody className="divide-y divide-border">
                {data.vendorPaymentsByVendor.map((v, i) => <tr key={i} className="hover:bg-muted/20"><td className="px-3 py-2 font-medium">{v.vendor}</td><td className="px-3 py-2 text-right font-semibold text-red-600">Rs {fmt(v.amount)}</td><td className="px-3 py-2 text-right text-muted-foreground">{v.count}</td></tr>)}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <div>
        <button onClick={() => setShowDetails(!showDetails)} className="text-sm text-primary font-medium cursor-pointer hover:underline">{showDetails ? "Hide" : "Show"} expense details ({data.expenseDetails.length} items)</button>
        {showDetails && (
          <div className="mt-2 bg-background rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border"><tr><th className="text-left px-3 py-2 font-medium text-muted-foreground">Date</th><th className="text-left px-3 py-2 font-medium text-muted-foreground">Description</th><th className="text-left px-3 py-2 font-medium text-muted-foreground">Category</th><th className="text-left px-3 py-2 font-medium text-muted-foreground">Account</th><th className="text-right px-3 py-2 font-medium text-muted-foreground">Amount</th></tr></thead>
              <tbody className="divide-y divide-border">
                {data.expenseDetails.map((e, i) => (
                  <tr key={i} className="hover:bg-muted/20">
                    <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{new Date(e.date).toLocaleDateString()}</td>
                    <td className="px-3 py-2">{e.description || "—"}</td>
                    <td className="px-3 py-2">{e.category}</td>
                    <td className="px-3 py-2">{e.account}</td>
                    <td className="px-3 py-2 text-right font-semibold text-red-600">Rs {fmt(e.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

interface AnnualPayrollData {
  year: number; totalGross: number; totalDeductions: number; totalNet: number; totalAdvancesTaken: number;
  employees: Array<{ employeeId: number; name: string; designation: string; totalGross: number; totalAdvanceDeducted: number; totalNet: number; totalAdvancesTaken: number; monthsPaid: number; months: Array<{ month: number; gross: number; deductions: number; net: number; paid: boolean }> }>;
}

function AnnualPayrollReport({ data, onExport }: { data: AnnualPayrollData; onExport: (rows: unknown[][], file: string) => void }) {
  const [expandedEmp, setExpandedEmp] = React.useState<number | null>(null);
  if (!data?.employees) return <div className="py-16 text-center text-muted-foreground">No data available.</div>;
  const csvRows = [
    ["Employee", "Designation", "Gross Salary", "Advance Deducted", "Net Salary", "Advances Taken", "Months Paid"],
    ...data.employees.map(e => [e.name, e.designation || "", e.totalGross, e.totalAdvanceDeducted, e.totalNet, e.totalAdvancesTaken, e.monthsPaid]),
    ["TOTAL", "", data.totalGross, data.totalDeductions, data.totalNet, data.totalAdvancesTaken, ""],
  ];
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <StatBox label={`${data.year} Gross`} value={`Rs ${fmt(data.totalGross)}`} color="text-foreground" />
          <StatBox label="Deductions" value={`Rs ${fmt(data.totalDeductions)}`} color="text-amber-600" />
          <StatBox label="Net Paid" value={`Rs ${fmt(data.totalNet)}`} color="text-red-600" />
          <StatBox label="Advances Taken" value={`Rs ${fmt(data.totalAdvancesTaken)}`} color="text-orange-600" />
        </div>
        <Button variant="outline" size="sm" onClick={() => onExport(csvRows, `payroll-${data.year}.csv`)} className="gap-2 cursor-pointer print:hidden"><Download className="w-4 h-4" /> Export CSV</Button>
      </div>
      <div className="bg-background rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b border-border"><tr>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Employee</th>
            <th className="text-right px-4 py-3 font-medium text-muted-foreground">Gross</th>
            <th className="text-right px-4 py-3 font-medium text-muted-foreground">Deductions</th>
            <th className="text-right px-4 py-3 font-medium text-muted-foreground">Net Salary</th>
            <th className="text-right px-4 py-3 font-medium text-muted-foreground">Advances</th>
            <th className="text-right px-4 py-3 font-medium text-muted-foreground">Months</th>
          </tr></thead>
          <tbody className="divide-y divide-border">
            {data.employees.map(emp => (
              <React.Fragment key={emp.employeeId}>
                <tr className="hover:bg-muted/30 cursor-pointer" onClick={() => setExpandedEmp(expandedEmp === emp.employeeId ? null : emp.employeeId)}>
                  <td className="px-4 py-2.5"><p className="font-medium">{emp.name}</p>{emp.designation && <p className="text-xs text-muted-foreground">{emp.designation}</p>}</td>
                  <td className="px-4 py-2.5 text-right">Rs {fmt(emp.totalGross)}</td>
                  <td className="px-4 py-2.5 text-right text-amber-600">Rs {fmt(emp.totalAdvanceDeducted)}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-red-600">Rs {fmt(emp.totalNet)}</td>
                  <td className="px-4 py-2.5 text-right text-orange-600">Rs {fmt(emp.totalAdvancesTaken)}</td>
                  <td className="px-4 py-2.5 text-right">{emp.monthsPaid}/12</td>
                </tr>
                {expandedEmp === emp.employeeId && emp.months.length > 0 && (
                  <tr><td colSpan={6} className="bg-muted/10 px-4 py-3">
                    <div className="grid grid-cols-6 sm:grid-cols-12 gap-1">
                      {emp.months.map(m => (
                        <div key={m.month} className={`text-center p-1 rounded text-xs ${m.paid ? "bg-emerald-100 text-emerald-700" : "bg-red-50 text-red-500"}`}>
                          <p className="font-medium">{months[m.month - 1]}</p>
                          <p>Rs {fmt(m.net)}</p>
                        </div>
                      ))}
                    </div>
                  </td></tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-border bg-muted/20">
            <tr>
              <td className="px-4 py-3 font-bold">Total</td>
              <td className="px-4 py-3 text-right font-bold">Rs {fmt(data.totalGross)}</td>
              <td className="px-4 py-3 text-right font-bold text-amber-600">Rs {fmt(data.totalDeductions)}</td>
              <td className="px-4 py-3 text-right font-bold text-red-600">Rs {fmt(data.totalNet)}</td>
              <td className="px-4 py-3 text-right font-bold text-orange-600">Rs {fmt(data.totalAdvancesTaken)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

interface MonthlyData {
  year: number;
  months: Array<{ month: number; year: number; revenue: number; expenses: number; purchases: number; labour: number; salaries: number; advances: number; vendorPayments: number; totalCosts: number; netProfit: number }>;
}

function MonthlyReport({ data, onExport }: { data: MonthlyData; onExport: (rows: unknown[][], file: string) => void }) {
  if (!data?.months) return <div className="py-16 text-center text-muted-foreground">No data available.</div>;
  const csvRows = [
    ["Month", "Revenue", "Expenses", "Purchases", "Labour", "Salaries", "Advances", "Vendor Payments", "Total Costs", "Net Profit"],
    ...data.months.map(m => [months[m.month - 1], m.revenue, m.expenses, m.purchases, m.labour, m.salaries, m.advances, m.vendorPayments || 0, m.totalCosts, m.netProfit]),
  ];
  const totalRevenue = data.months.reduce((s, m) => s + m.revenue, 0);
  const totalCosts = data.months.reduce((s, m) => s + m.totalCosts, 0);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-4">
          <StatBox label={`${data.year} Total Revenue`} value={`Rs ${fmt(totalRevenue)}`} color="text-emerald-600" />
          <StatBox label={`${data.year} Total Costs`} value={`Rs ${fmt(totalCosts)}`} color="text-red-600" />
          <StatBox label="Net P&L" value={`Rs ${fmt(totalRevenue - totalCosts)}`} color={totalRevenue - totalCosts >= 0 ? "text-emerald-600" : "text-red-600"} />
        </div>
        <Button variant="outline" size="sm" onClick={() => onExport(csvRows, `monthly-${data.year}.csv`)} className="gap-2 cursor-pointer print:hidden"><Download className="w-4 h-4" /> Export CSV</Button>
      </div>
      <div className="bg-background rounded-xl border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Month</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Revenue</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Purchases</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Expenses</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Salaries</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Labour</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Vendor Pmts</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Total Costs</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Net P&L</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.months.map(m => (
              <tr key={m.month} className={`hover:bg-muted/30 ${m.revenue === 0 && m.totalCosts === 0 ? "opacity-40" : ""}`}>
                <td className="px-4 py-2.5 font-medium">{months[m.month - 1]} {m.year}</td>
                <td className="px-4 py-2.5 text-right text-emerald-600">Rs {fmt(m.revenue)}</td>
                <td className="px-4 py-2.5 text-right text-muted-foreground">Rs {fmt(m.purchases)}</td>
                <td className="px-4 py-2.5 text-right text-muted-foreground">Rs {fmt(m.expenses)}</td>
                <td className="px-4 py-2.5 text-right text-muted-foreground">Rs {fmt(m.salaries)}</td>
                <td className="px-4 py-2.5 text-right text-muted-foreground">Rs {fmt(m.labour)}</td>
                <td className="px-4 py-2.5 text-right text-muted-foreground">Rs {fmt(m.vendorPayments || 0)}</td>
                <td className="px-4 py-2.5 text-right text-red-600 font-semibold">Rs {fmt(m.totalCosts)}</td>
                <td className={`px-4 py-2.5 text-right font-bold ${m.netProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>Rs {fmt(m.netProfit)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-border bg-muted/20">
            <tr>
              <td className="px-4 py-3 font-bold">Total</td>
              <td className="px-4 py-3 text-right font-bold text-emerald-600">Rs {fmt(totalRevenue)}</td>
              <td colSpan={5} />
              <td className="px-4 py-3 text-right font-bold text-red-600">Rs {fmt(totalCosts)}</td>
              <td className={`px-4 py-3 text-right font-bold ${totalRevenue - totalCosts >= 0 ? "text-emerald-600" : "text-red-600"}`}>Rs {fmt(totalRevenue - totalCosts)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

interface ExpenseSummaryData {
  from: string; to: string; total: number;
  byCategory: Array<{ category: string; amount: number; count: number; pct: number }>;
  byAccount: Array<{ account: string; amount: number; count: number }>;
}

function ExpenseSummaryReport({ data, onExport }: { data: ExpenseSummaryData; onExport: (rows: unknown[][], file: string) => void }) {
  if (!data?.byCategory) return <div className="py-16 text-center text-muted-foreground">No data available.</div>;
  const csvRows = [
    ["Category", "Amount", "Count", "%"],
    ...data.byCategory.map(e => [e.category, e.amount, e.count, e.pct + "%"]),
  ];
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <StatBox label="Total Expenses" value={`Rs ${fmt(data.total)}`} color="text-red-600" />
        <Button variant="outline" size="sm" onClick={() => onExport(csvRows, "expense-summary.csv")} className="gap-2 cursor-pointer print:hidden"><Download className="w-4 h-4" /> Export CSV</Button>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <p className="text-sm font-semibold mb-2">By Category</p>
          <div className="bg-background rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr><th className="text-left px-4 py-3 font-medium text-muted-foreground">Category</th><th className="text-right px-4 py-3 font-medium text-muted-foreground">Amount</th><th className="text-right px-4 py-3 font-medium text-muted-foreground">%</th></tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.byCategory.map((e, i) => (
                  <tr key={i} className="hover:bg-muted/30">
                    <td className="px-4 py-2.5">{e.category}</td>
                    <td className="px-4 py-2.5 text-right font-semibold">Rs {fmt(e.amount)}</td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground">{e.pct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold mb-2">By Account</p>
          <div className="bg-background rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr><th className="text-left px-4 py-3 font-medium text-muted-foreground">Account</th><th className="text-right px-4 py-3 font-medium text-muted-foreground">Amount</th><th className="text-right px-4 py-3 font-medium text-muted-foreground">Txns</th></tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.byAccount.map((e, i) => (
                  <tr key={i} className="hover:bg-muted/30">
                    <td className="px-4 py-2.5">{e.account}</td>
                    <td className="px-4 py-2.5 text-right font-semibold">Rs {fmt(e.amount)}</td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground">{e.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

interface CollectionData {
  from: string; to: string; grandTotal: number;
  accounts: Array<{ accountId: number; accountName: string; accountType: string; totalReceived: number; totalTransfersIn: number; paymentCount: number; payments: Array<{ date: string; amount: number; invoiceNo: string; customer: string; method: string }> }>;
}

function CollectionReport({ data, onExport }: { data: CollectionData; onExport: (rows: unknown[][], file: string) => void }) {
  if (!data?.accounts) return <div className="py-16 text-center text-muted-foreground">No data available.</div>;
  const csvRows = [
    ["Account", "Invoice", "Customer", "Date", "Amount", "Method"],
    ...data.accounts.flatMap(a => a.payments.map(p => [a.accountName, p.invoiceNo, p.customer, new Date(p.date).toLocaleDateString(), p.amount, p.method || ""])),
  ];
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex gap-3">
          <StatBox label="Total Collected" value={`Rs ${fmt(data.grandTotal)}`} color="text-emerald-600" />
          <StatBox label="Accounts" value={String(data.accounts.length)} color="text-blue-600" />
        </div>
        <Button variant="outline" size="sm" onClick={() => onExport(csvRows, "collection-report.csv")} className="gap-2 cursor-pointer print:hidden"><Download className="w-4 h-4" /> Export CSV</Button>
      </div>
      {data.accounts.filter(a => a.totalReceived > 0 || a.paymentCount > 0).map(acc => (
        <div key={acc.accountId} className="bg-background rounded-xl border border-border overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/20">
            <div><p className="font-semibold">{acc.accountName}</p><p className="text-xs text-muted-foreground capitalize">{acc.accountType}</p></div>
            <p className="text-lg font-bold text-emerald-600">Rs {fmt(acc.totalReceived)}</p>
          </div>
          {acc.payments.length === 0 ? (
            <p className="text-center py-4 text-muted-foreground text-sm">No payments received in this period</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/30 border-b border-border"><tr>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Date</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Invoice</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Customer</th>
                <th className="text-right px-4 py-2 font-medium text-muted-foreground">Amount</th>
              </tr></thead>
              <tbody className="divide-y divide-border">
                {acc.payments.map((p, i) => (
                  <tr key={i} className="hover:bg-muted/20">
                    <td className="px-4 py-2 text-muted-foreground">{new Date(p.date).toLocaleDateString()}</td>
                    <td className="px-4 py-2 font-medium">{p.invoiceNo}</td>
                    <td className="px-4 py-2">{p.customer}</td>
                    <td className="px-4 py-2 text-right font-semibold text-emerald-600">Rs {fmt(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ))}
      {data.accounts.every(a => a.totalReceived === 0) && (
        <div className="text-center py-12 text-muted-foreground">No payments collected in this period.</div>
      )}
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-background rounded-xl border border-border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold mt-1 ${color}`}>{value}</p>
    </div>
  );
}

interface SalarySheetData {
  salarySheet: Array<{ id: number; employee: string; designation: string; period: string; baseSalary: number; advanceDeducted: number; netSalary: number; isPaid: boolean; account: string; note: string }>;
  totalGross: number; totalDeductions: number; totalNet: number; paidCount: number; unpaidCount: number;
}
function SalarySheetReport({ data, onExport }: { data: SalarySheetData; onExport: (rows: unknown[][], file: string) => void }) {
  if (!data?.salarySheet) return <div className="py-16 text-center text-muted-foreground">No data available.</div>;
  const csvRows = [
    ["Employee", "Designation", "Period", "Base Salary", "Advance Deducted", "Net Salary", "Status", "Account", "Note"],
    ...data.salarySheet.map(r => [r.employee, r.designation, r.period, r.baseSalary, r.advanceDeducted, r.netSalary, r.isPaid ? "Paid" : "Unpaid", r.account, r.note]),
  ];
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-3 flex-wrap">
          <StatBox label="Total Gross" value={`Rs ${fmt(data.totalGross)}`} color="text-blue-600" />
          <StatBox label="Total Deductions" value={`Rs ${fmt(data.totalDeductions)}`} color="text-amber-600" />
          <StatBox label="Total Net" value={`Rs ${fmt(data.totalNet)}`} color="text-emerald-600" />
          <StatBox label="Paid" value={String(data.paidCount)} color="text-emerald-600" />
          <StatBox label="Unpaid" value={String(data.unpaidCount)} color="text-red-500" />
        </div>
        <Button variant="outline" size="sm" onClick={() => onExport(csvRows, "salary-sheet.csv")} className="gap-2 cursor-pointer print:hidden"><Download className="w-4 h-4" /> Export CSV</Button>
      </div>
      {data.salarySheet.length === 0 ? <div className="text-center py-12 text-muted-foreground">No salary records found.</div> : (
        <div className="bg-background rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border"><tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Employee</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Period</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Base</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Deducted</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Net</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Paid From</th>
              <th className="text-center px-4 py-3 font-medium text-muted-foreground">Status</th>
            </tr></thead>
            <tbody className="divide-y divide-border">
              {data.salarySheet.map(r => (
                <tr key={r.id} className="hover:bg-muted/30">
                  <td className="px-4 py-2.5"><p className="font-medium">{r.employee}</p>{r.designation && <p className="text-xs text-muted-foreground">{r.designation}</p>}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{r.period}</td>
                  <td className="px-4 py-2.5 text-right">Rs {fmt(r.baseSalary)}</td>
                  <td className="px-4 py-2.5 text-right text-amber-600">{r.advanceDeducted > 0 ? `-Rs ${fmt(r.advanceDeducted)}` : "—"}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-emerald-600">Rs {fmt(r.netSalary)}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{r.account}</td>
                  <td className="px-4 py-2.5 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.isPaid ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}>{r.isPaid ? "Paid" : "Unpaid"}</span></td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-border bg-muted/30">
              <tr>
                <td className="px-4 py-2.5 font-semibold" colSpan={2}>Total</td>
                <td className="px-4 py-2.5 text-right font-semibold">Rs {fmt(data.totalGross)}</td>
                <td className="px-4 py-2.5 text-right font-semibold text-amber-600">-Rs {fmt(data.totalDeductions)}</td>
                <td className="px-4 py-2.5 text-right font-semibold text-emerald-600">Rs {fmt(data.totalNet)}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

interface AdvanceReportData {
  advances: Array<{ id: number; employee: string; designation: string; date: string; reason: string; account: string; amount: number; repaid: number; balance: number; status: string }>;
  totalGiven: number; totalRepaid: number; totalOutstanding: number;
  byEmployee: Array<{ name: string; totalGiven: number; totalRepaid: number; balance: number }>;
}
function AdvanceReportComp({ data, onExport }: { data: AdvanceReportData; onExport: (rows: unknown[][], file: string) => void }) {
  const [view, setView] = React.useState<"detail" | "summary">("detail");
  if (!data?.advances) return <div className="py-16 text-center text-muted-foreground">No data available.</div>;
  const csvRows = [
    ["Employee", "Date", "Reason", "Account", "Amount", "Repaid", "Balance", "Status"],
    ...data.advances.map(a => [a.employee, new Date(a.date).toLocaleDateString(), a.reason, a.account, a.amount, a.repaid, a.balance, a.status]),
  ];
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-3 flex-wrap">
          <StatBox label="Total Given" value={`Rs ${fmt(data.totalGiven)}`} color="text-blue-600" />
          <StatBox label="Total Repaid" value={`Rs ${fmt(data.totalRepaid)}`} color="text-emerald-600" />
          <StatBox label="Outstanding" value={`Rs ${fmt(data.totalOutstanding)}`} color="text-amber-600" />
        </div>
        <div className="flex gap-2">
          <div className="flex gap-1 rounded-lg border border-border p-0.5">
            <button onClick={() => setView("detail")} className={`px-3 py-1.5 text-xs rounded-md cursor-pointer ${view === "detail" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>Detail</button>
            <button onClick={() => setView("summary")} className={`px-3 py-1.5 text-xs rounded-md cursor-pointer ${view === "summary" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>By Employee</button>
          </div>
          <Button variant="outline" size="sm" onClick={() => onExport(csvRows, "advance-report.csv")} className="gap-2 cursor-pointer print:hidden"><Download className="w-4 h-4" /> Export CSV</Button>
        </div>
      </div>
      {view === "detail" ? (
        data.advances.length === 0 ? <div className="text-center py-12 text-muted-foreground">No advance records found.</div> : (
          <div className="bg-background rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border"><tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Employee</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Reason</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Amount</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Repaid</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Balance</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">Status</th>
              </tr></thead>
              <tbody className="divide-y divide-border">
                {data.advances.map(a => (
                  <tr key={a.id} className="hover:bg-muted/30">
                    <td className="px-4 py-2.5 text-muted-foreground">{new Date(a.date).toLocaleDateString()}</td>
                    <td className="px-4 py-2.5 font-medium">{a.employee}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{a.reason || "—"}</td>
                    <td className="px-4 py-2.5 text-right font-semibold">Rs {fmt(a.amount)}</td>
                    <td className="px-4 py-2.5 text-right text-emerald-600">Rs {fmt(a.repaid)}</td>
                    <td className={`px-4 py-2.5 text-right font-semibold ${a.balance > 0 ? "text-amber-600" : "text-emerald-600"}`}>Rs {fmt(a.balance)}</td>
                    <td className="px-4 py-2.5 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${a.status === "cleared" ? "bg-emerald-100 text-emerald-700" : a.status === "partial" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>{a.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        <div className="bg-background rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border"><tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Employee</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Total Given</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Total Repaid</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Outstanding</th>
            </tr></thead>
            <tbody className="divide-y divide-border">
              {data.byEmployee.map((e, i) => (
                <tr key={i} className="hover:bg-muted/30">
                  <td className="px-4 py-2.5 font-medium">{e.name}</td>
                  <td className="px-4 py-2.5 text-right">Rs {fmt(e.totalGiven)}</td>
                  <td className="px-4 py-2.5 text-right text-emerald-600">Rs {fmt(e.totalRepaid)}</td>
                  <td className={`px-4 py-2.5 text-right font-semibold ${e.balance > 0 ? "text-amber-600" : "text-emerald-600"}`}>Rs {fmt(e.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

interface LabourReportData {
  from: string; to: string;
  payments: Array<{ id: number; date: string; description: string; account: string; amount: number; note: string }>;
  totalAmount: number; paymentCount: number;
  byAccount: Array<{ account: string; amount: number; count: number }>;
}
function LabourReportComp({ data, onExport }: { data: LabourReportData; onExport: (rows: unknown[][], file: string) => void }) {
  if (!data?.payments) return <div className="py-16 text-center text-muted-foreground">No data available.</div>;
  const csvRows = [
    ["Date", "Description", "Account", "Amount", "Note"],
    ...data.payments.map(p => [new Date(p.date).toLocaleDateString(), p.description, p.account, p.amount, p.note]),
  ];
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-3 flex-wrap">
          <StatBox label="Total Labour Cost" value={`Rs ${fmt(data.totalAmount)}`} color="text-blue-600" />
          <StatBox label="Payments" value={String(data.paymentCount)} color="text-muted-foreground" />
        </div>
        <Button variant="outline" size="sm" onClick={() => onExport(csvRows, "labour-report.csv")} className="gap-2 cursor-pointer print:hidden"><Download className="w-4 h-4" /> Export CSV</Button>
      </div>
      {data.byAccount.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {data.byAccount.map((a, i) => <StatBox key={i} label={a.account} value={`Rs ${fmt(a.amount)}`} color="text-foreground" />)}
        </div>
      )}
      {data.payments.length === 0 ? <div className="text-center py-12 text-muted-foreground">No labour payments in this period.</div> : (
        <div className="bg-background rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border"><tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Description</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Account</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Amount</th>
            </tr></thead>
            <tbody className="divide-y divide-border">
              {data.payments.map(p => (
                <tr key={p.id} className="hover:bg-muted/30">
                  <td className="px-4 py-2.5 text-muted-foreground">{new Date(p.date).toLocaleDateString()}</td>
                  <td className="px-4 py-2.5">{p.description || "—"}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{p.account}</td>
                  <td className="px-4 py-2.5 text-right font-semibold">Rs {fmt(p.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-border bg-muted/30">
              <tr>
                <td className="px-4 py-2 font-semibold" colSpan={3}>Total</td>
                <td className="px-4 py-2 text-right font-semibold">Rs {fmt(data.totalAmount)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

interface InvoiceStatusData {
  from: string; to: string; invoiceCount: number; totalSales: number; totalCollected: number; totalPending: number; totalDiscount: number;
  statusSummary: Array<{ status: string; count: number; totalAmount: number; totalDiscount: number; totalPaid: number; netAmount: number }>;
  invoices: Array<{ id: number; invoiceNo: string; date: string; customer: string; totalAmount: number; discount: number; netAmount: number; paidAmount: number; balance: number; status: string; lastPayment: string | null }>;
}
function InvoiceStatusReport({ data, onExport }: { data: InvoiceStatusData; onExport: (rows: unknown[][], file: string) => void }) {
  if (!data?.invoices) return <div className="py-16 text-center text-muted-foreground">No data available.</div>;
  const statusColors: Record<string, string> = { paid: "bg-emerald-100 text-emerald-700", partial: "bg-amber-100 text-amber-700", unpaid: "bg-red-100 text-red-700" };
  const csvRows = [
    ["Invoice No", "Date", "Customer", "Total", "Discount", "Net", "Paid", "Balance", "Status"],
    ...data.invoices.map(i => [i.invoiceNo, new Date(i.date).toLocaleDateString(), i.customer, i.totalAmount, i.discount, i.netAmount, i.paidAmount, i.balance, i.status]),
  ];
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-3 flex-wrap">
          <StatBox label="Total Sales" value={`Rs ${fmt(data.totalSales)}`} color="text-blue-600" />
          <StatBox label="Collected" value={`Rs ${fmt(data.totalCollected)}`} color="text-emerald-600" />
          <StatBox label="Pending" value={`Rs ${fmt(data.totalPending)}`} color="text-amber-600" />
          <StatBox label="Discount" value={`Rs ${fmt(data.totalDiscount)}`} color="text-muted-foreground" />
        </div>
        <Button variant="outline" size="sm" onClick={() => onExport(csvRows, "invoice-status.csv")} className="gap-2 cursor-pointer print:hidden"><Download className="w-4 h-4" /> Export CSV</Button>
      </div>
      {data.statusSummary.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {data.statusSummary.map(s => (
            <div key={s.status} className="bg-background rounded-xl border border-border p-3">
              <div className="flex items-center justify-between mb-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[s.status] || "bg-muted text-foreground"}`}>{s.status}</span>
                <span className="text-xs text-muted-foreground">{s.count} invoice{s.count !== 1 ? "s" : ""}</span>
              </div>
              <p className="text-lg font-bold">Rs {fmt(s.netAmount)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Paid: Rs {fmt(s.totalPaid)}</p>
            </div>
          ))}
        </div>
      )}
      {data.invoices.length === 0 ? <div className="text-center py-12 text-muted-foreground">No invoices found in this period.</div> : (
        <div className="bg-background rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border"><tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Invoice</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Customer</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Net</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Paid</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Balance</th>
              <th className="text-center px-4 py-3 font-medium text-muted-foreground">Status</th>
            </tr></thead>
            <tbody className="divide-y divide-border">
              {data.invoices.map(inv => (
                <tr key={inv.id} className="hover:bg-muted/30">
                  <td className="px-4 py-2.5 font-medium">{inv.invoiceNo}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{new Date(inv.date).toLocaleDateString()}</td>
                  <td className="px-4 py-2.5">{inv.customer}</td>
                  <td className="px-4 py-2.5 text-right">Rs {fmt(inv.netAmount)}</td>
                  <td className="px-4 py-2.5 text-right text-emerald-600">Rs {fmt(inv.paidAmount)}</td>
                  <td className={`px-4 py-2.5 text-right font-semibold ${inv.balance > 0 ? "text-amber-600" : "text-emerald-600"}`}>Rs {fmt(inv.balance)}</td>
                  <td className="px-4 py-2.5 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[inv.status] || "bg-muted text-foreground"}`}>{inv.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

interface SupplierLedgerEntry {
  date: string; type: string; description: string; debit: number; credit: number; balance: number;
}
interface SupplierLedgerSupplier {
  supplier: { id: number; name: string; phone?: string };
  totalPurchased: number; totalPaid: number; balance: number;
  ledger: SupplierLedgerEntry[];
}
interface SupplierLedgerData {
  suppliers: SupplierLedgerSupplier[];
  dateFrom?: string; dateTo?: string;
}

function SupplierLedgerReport({ data, onExport }: { data: SupplierLedgerData; onExport: (rows: unknown[][], file: string) => void }) {
  if (!data?.suppliers) return <div className="py-16 text-center text-muted-foreground">No data available.</div>;
  const handleExport = () => {
    const rows: unknown[][] = [["Supplier", "Date", "Type", "Description", "Debit", "Credit", "Balance"]];
    for (const s of data.suppliers) {
      for (const e of s.ledger) {
        rows.push([s.supplier.name, new Date(e.date).toLocaleDateString(), e.type, e.description, e.debit, e.credit, e.balance]);
      }
    }
    onExport(rows, "supplier-ledger.csv");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Supplier Ledger Report</h2>
          {data.dateFrom && <p className="text-sm text-muted-foreground">{new Date(data.dateFrom).toLocaleDateString()} – {data.dateTo ? new Date(data.dateTo).toLocaleDateString() : "Today"}</p>}
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} className="gap-2 cursor-pointer print:hidden">
          <Download className="w-4 h-4" /> Export CSV
        </Button>
      </div>
      {data.suppliers.length === 0 ? (
        <p className="text-muted-foreground text-sm py-8 text-center">No supplier data found.</p>
      ) : (
        data.suppliers.map(s => (
          <div key={s.supplier.id} className="rounded-xl border border-border overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-muted/40">
              <div>
                <p className="font-semibold">{s.supplier.name}</p>
                {s.supplier.phone && <p className="text-xs text-muted-foreground">{s.supplier.phone}</p>}
              </div>
              <div className="flex gap-6 text-sm">
                <div className="text-right"><p className="text-xs text-muted-foreground">Purchased</p><p className="font-semibold text-rose-600">Rs {fmt(s.totalPurchased)}</p></div>
                <div className="text-right"><p className="text-xs text-muted-foreground">Paid</p><p className="font-semibold text-emerald-600">Rs {fmt(s.totalPaid)}</p></div>
                <div className="text-right"><p className="text-xs text-muted-foreground">Balance</p><p className={`font-bold ${s.balance > 0 ? "text-amber-600" : "text-emerald-600"}`}>Rs {fmt(s.balance)}</p></div>
              </div>
            </div>
            {s.ledger.length === 0 ? (
              <p className="text-muted-foreground text-xs py-4 text-center">No transactions in this period.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/20 border-b border-border">
                    <tr>
                      <th className="text-left px-4 py-2 font-medium text-muted-foreground">Date</th>
                      <th className="text-left px-4 py-2 font-medium text-muted-foreground">Description</th>
                      <th className="text-right px-4 py-2 font-medium text-muted-foreground">Debit (Purchase)</th>
                      <th className="text-right px-4 py-2 font-medium text-muted-foreground">Credit (Payment)</th>
                      <th className="text-right px-4 py-2 font-medium text-muted-foreground">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {s.ledger.map((e, i) => (
                      <tr key={i} className="hover:bg-muted/30">
                        <td className="px-4 py-2 text-muted-foreground">{new Date(e.date).toLocaleDateString()}</td>
                        <td className="px-4 py-2">{e.description}</td>
                        <td className="px-4 py-2 text-right text-rose-600">{e.debit > 0 ? `Rs ${fmt(e.debit)}` : "—"}</td>
                        <td className="px-4 py-2 text-right text-emerald-600">{e.credit > 0 ? `Rs ${fmt(e.credit)}` : "—"}</td>
                        <td className={`px-4 py-2 text-right font-semibold ${e.balance > 0 ? "text-amber-600" : "text-emerald-600"}`}>Rs {fmt(e.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

interface VendorPaymentRecord { amount: number; type: string; accountName: string; date: string; notes?: string | null; }
interface VendorWorkEntry { workType: string; quantity: number; ratePerPiece: number; totalCost: number; date: string; }
interface ProductionJobsData {
  jobs: Array<{
    id: number; collection: string; description: string | null; status: string; createdAt: string;
    totalWorkValue: number; totalPaid: number; outstanding: number; vendorCount: number;
    vendors: Array<{ name: string; workValue: number; paid: number; balance: number; workEntries: VendorWorkEntry[]; payments: VendorPaymentRecord[] }>;
  }>;
  summary: { totalJobs: number; totalWorkValue: number; totalPaid: number; totalOutstanding: number };
}

function ProductionJobsReport({ data, onExport }: { data: ProductionJobsData; onExport: (rows: unknown[][], file: string) => void }) {
  const [expandedJob, setExpandedJob] = React.useState<number | null>(null);
  const [expandedVendor, setExpandedVendor] = React.useState<string | null>(null);
  if (!data?.jobs) return <div className="py-16 text-center text-muted-foreground">No data available.</div>;

  const csvRows: unknown[][] = [
    ["Collection", "Description", "Status", "Date", "Work Value", "Paid", "Outstanding", "Vendors"],
    ...data.jobs.map(j => [j.collection, j.description || "", j.status, new Date(j.createdAt).toLocaleDateString(), j.totalWorkValue, j.totalPaid, j.outstanding, j.vendorCount]),
    [],
    ["—— Vendor Payment Detail ——"],
    ["Collection", "Vendor", "Payment Type", "Amount", "Account", "Date", "Notes"],
    ...data.jobs.flatMap(j =>
      (j.vendors || []).flatMap(v =>
        (v.payments || []).map(p => [j.collection, v.name, p.type === "advance" ? "Advance" : "Payment", p.amount, p.accountName, new Date(p.date).toLocaleDateString(), p.notes || ""])
      )
    ),
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-3">
          <StatBox label="Total Jobs" value={String(data.summary.totalJobs)} color="text-foreground" />
          <StatBox label="Total Work Value" value={`Rs ${fmt(data.summary.totalWorkValue)}`} color="text-foreground" />
          <StatBox label="Total Paid" value={`Rs ${fmt(data.summary.totalPaid)}`} color="text-emerald-600" />
          <StatBox label="Outstanding" value={`Rs ${fmt(data.summary.totalOutstanding)}`} color={data.summary.totalOutstanding > 0 ? "text-amber-600" : "text-emerald-600"} />
        </div>
        <Button variant="outline" size="sm" onClick={() => onExport(csvRows, "production-jobs.csv")} className="gap-2 cursor-pointer print:hidden"><Download className="w-4 h-4" /> Export CSV</Button>
      </div>
      {data.jobs.length === 0 ? (
        <p className="text-center py-12 text-muted-foreground">No production jobs found.</p>
      ) : (
        <div className="space-y-2">
          {data.jobs.map(job => (
            <div key={job.id} className="rounded-xl border border-border overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 hover:bg-muted/20 cursor-pointer" onClick={() => { setExpandedJob(expandedJob === job.id ? null : job.id); setExpandedVendor(null); }}>
                <div className="flex items-center gap-3">
                  <div>
                    <p className="font-semibold">{job.collection}</p>
                    {job.description && <p className="text-xs text-muted-foreground">{job.description}</p>}
                    <p className="text-xs text-muted-foreground">{new Date(job.createdAt).toLocaleDateString()} · {job.vendorCount} vendor{job.vendorCount !== 1 ? "s" : ""}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${job.status === "active" ? "bg-blue-100 text-blue-700" : job.status === "completed" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>{job.status}</span>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <div className="text-right"><p className="text-xs text-muted-foreground">Work Value</p><p className="font-semibold">Rs {fmt(job.totalWorkValue)}</p></div>
                  <div className="text-right"><p className="text-xs text-muted-foreground">Paid</p><p className="font-semibold text-emerald-600">Rs {fmt(job.totalPaid)}</p></div>
                  <div className="text-right"><p className="text-xs text-muted-foreground">Outstanding</p><p className={`font-bold ${job.outstanding > 0 ? "text-amber-600" : "text-emerald-600"}`}>Rs {fmt(job.outstanding)}</p></div>
                </div>
              </div>
              {expandedJob === job.id && (job.vendors || []).length > 0 && (
                <div className="border-t border-border bg-muted/10">
                  {(job.vendors || []).map((v, i) => {
                    const vendorKey = `${job.id}-${v.name}`;
                    const isVendorOpen = expandedVendor === vendorKey;
                    return (
                      <div key={i} className="border-b border-border last:border-b-0">
                        <div
                          className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/20 cursor-pointer"
                          onClick={() => setExpandedVendor(isVendorOpen ? null : vendorKey)}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{v.name}</span>
                            {(v.payments || []).length > 0 && (
                              <span className="text-xs text-muted-foreground">({(v.payments || []).length} payment{(v.payments || []).length !== 1 ? "s" : ""})</span>
                            )}
                          </div>
                          <div className="flex items-center gap-6 text-sm">
                            <div className="text-right"><p className="text-xs text-muted-foreground">Work</p><p className="font-medium">Rs {fmt(v.workValue)}</p></div>
                            <div className="text-right"><p className="text-xs text-muted-foreground">Paid</p><p className="font-medium text-emerald-600">Rs {fmt(v.paid)}</p></div>
                            <div className="text-right"><p className="text-xs text-muted-foreground">Balance</p><p className={`font-bold text-sm ${v.balance > 0 ? "text-amber-600" : "text-emerald-600"}`}>{v.balance === 0 ? "Cleared" : `Rs ${fmt(v.balance)}`}</p></div>
                          </div>
                        </div>
                        {isVendorOpen && (
                          <div className="bg-background border-t border-border/60 px-4 pb-3 pt-2 space-y-3">
                            {(v.workEntries || []).length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Work Entries</p>
                                <table className="w-full text-xs">
                                  <thead><tr className="text-muted-foreground"><th className="text-left pb-1 font-medium">Type</th><th className="text-right pb-1 font-medium">Qty</th><th className="text-right pb-1 font-medium">Rate</th><th className="text-right pb-1 font-medium">Total</th><th className="text-right pb-1 font-medium">Date</th></tr></thead>
                                  <tbody className="divide-y divide-border/40">
                                    {(v.workEntries || []).map((we, wi) => (
                                      <tr key={wi} className="hover:bg-muted/10">
                                        <td className="py-1"><span className="px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded text-xs">{we.workType}</span></td>
                                        <td className="py-1 text-right text-muted-foreground">{we.quantity}</td>
                                        <td className="py-1 text-right text-muted-foreground">Rs {fmt(we.ratePerPiece)}</td>
                                        <td className="py-1 text-right font-semibold">Rs {fmt(we.totalCost)}</td>
                                        <td className="py-1 text-right text-muted-foreground">{new Date(we.date).toLocaleDateString("en-PK")}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                            {(v.payments || []).length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Payment History</p>
                                <table className="w-full text-xs">
                                  <thead><tr className="text-muted-foreground"><th className="text-left pb-1 font-medium">Type</th><th className="text-left pb-1 font-medium">Account</th><th className="text-right pb-1 font-medium">Amount</th><th className="text-right pb-1 font-medium">Date</th></tr></thead>
                                  <tbody className="divide-y divide-border/40">
                                    {(v.payments || []).map((p, pi) => (
                                      <tr key={pi} className="hover:bg-muted/10">
                                        <td className="py-1"><span className={`px-1.5 py-0.5 rounded text-xs font-medium ${p.type === "advance" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"}`}>{p.type === "advance" ? "Advance" : "Payment"}</span></td>
                                        <td className="py-1 text-muted-foreground">{p.accountName}</td>
                                        <td className="py-1 text-right font-semibold text-emerald-600">Rs {fmt(p.amount)}</td>
                                        <td className="py-1 text-right text-muted-foreground">{new Date(p.date).toLocaleDateString("en-PK")}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                            {(v.payments || []).length === 0 && (v.workEntries || []).length === 0 && (
                              <p className="text-xs text-muted-foreground italic">No entries or payments recorded.</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface SalaryDueData {
  month: number; year: number; monthName: string;
  employees: Array<{
    id: number; name: string; designation: string;
    monthlySalary: number; baseSalary: number;
    outstandingAdvance: number; invoiceOutstanding: number;
    advanceDeducted: number; absenceDays: number;
    absenceDeduction: number; invoiceDeducted: number;
    netSalary: number; isPaid: boolean; isProcessed: boolean;
    salaryRecordId: number | null; note: string;
  }>;
  summary: {
    totalEmployees: number; processedCount: number;
    paidCount: number; unpaidCount: number;
    totalBase: number; totalDeduct: number; totalNet: number;
    totalPaid: number; totalPending: number; totalInvoiceDue: number;
  };
}

function SalaryDueReport({ data, onExport }: { data: SalaryDueData; onExport: (rows: unknown[][], file: string) => void }) {
  if (!data?.employees) return <div className="py-16 text-center text-muted-foreground">No data available.</div>;

  const csvRows = [
    ["Employee", "Designation", "Base Salary", "Adv. Balance", "Inv. Due", "Adv. Deducted", "Absence Days", "Absence Ded.", "Inv. Deducted", "Net Salary", "Status"],
    ...data.employees.map(e => [
      e.name, e.designation, e.baseSalary,
      e.outstandingAdvance, e.invoiceOutstanding,
      e.advanceDeducted, e.absenceDays, e.absenceDeduction, e.invoiceDeducted,
      e.netSalary,
      e.isPaid ? "Paid" : e.isProcessed ? "Processed (Unpaid)" : "Pending",
    ]),
    [],
    ["TOTAL", "", data.summary.totalBase, "", "", data.summary.totalDeduct, "", "", "", data.summary.totalNet, ""],
  ];

  const unpaidEmployees = data.employees.filter(e => !e.isPaid);
  const paidEmployees = data.employees.filter(e => e.isPaid);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-base font-bold">{data.monthName} {data.year} — Salary Due</h2>
          <p className="text-xs text-muted-foreground">{data.summary.unpaidCount} employees pending · {data.summary.paidCount} paid</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => onExport(csvRows, `salary-due-${data.monthName}-${data.year}.csv`)} className="gap-2 cursor-pointer print:hidden"><Download className="w-4 h-4" /> Export CSV</Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatBox label="Total Employees" value={String(data.summary.totalEmployees)} color="text-foreground" />
        <StatBox label="Total Gross" value={`Rs ${fmt(data.summary.totalBase)}`} color="text-foreground" />
        <StatBox label="Total Deductions" value={`Rs ${fmt(data.summary.totalDeduct)}`} color="text-amber-600" />
        <StatBox label="Net Payable" value={`Rs ${fmt(data.summary.totalNet)}`} color="text-blue-600" />
        {(data.summary.totalInvoiceDue ?? 0) > 0 && (
          <StatBox label="Invoice Due (All)" value={`Rs ${fmt(data.summary.totalInvoiceDue)}`} color="text-purple-600" />
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="rounded-xl border border-border p-3 bg-red-50/30">
          <p className="text-xs font-semibold text-red-700 mb-1">Pending Payment</p>
          <p className="text-2xl font-bold text-red-600">Rs {fmt(data.summary.totalPending)}</p>
          <p className="text-xs text-muted-foreground">{data.summary.unpaidCount} employees</p>
        </div>
        <div className="rounded-xl border border-border p-3 bg-emerald-50/30">
          <p className="text-xs font-semibold text-emerald-700 mb-1">Already Paid</p>
          <p className="text-2xl font-bold text-emerald-600">Rs {fmt(data.summary.totalPaid)}</p>
          <p className="text-xs text-muted-foreground">{data.summary.paidCount} employees</p>
        </div>
      </div>

      {unpaidEmployees.length > 0 && (
        <div>
          <p className="text-sm font-semibold mb-2 text-red-700">Pending — Pay These Employees</p>
          <div className="bg-background rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-red-50/50 border-b border-border">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Employee</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Base Salary</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Adv. Balance</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Inv. Due</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Deductions</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Net to Pay</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {unpaidEmployees.map(e => {
                  const totalDed = e.advanceDeducted + e.absenceDeduction + e.invoiceDeducted;
                  return (
                    <tr key={e.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <p className="font-semibold">{e.name}</p>
                        {e.designation && <p className="text-xs text-muted-foreground">{e.designation}</p>}
                        {e.note && <p className="text-xs text-muted-foreground italic">{e.note}</p>}
                      </td>
                      <td className="px-4 py-3 text-right">Rs {fmt(e.baseSalary)}</td>
                      <td className="px-4 py-3 text-right text-amber-600">{e.outstandingAdvance > 0 ? `Rs ${fmt(e.outstandingAdvance)}` : <span className="text-emerald-600 text-xs">—</span>}</td>
                      <td className="px-4 py-3 text-right text-purple-600">{e.invoiceOutstanding > 0 ? `Rs ${fmt(e.invoiceOutstanding)}` : <span className="text-muted-foreground text-xs">—</span>}</td>
                      <td className="px-4 py-3 text-right">
                        {totalDed > 0 ? (
                          <span className="text-red-500">
                            — Rs {fmt(totalDed)}
                            <span className="block text-xs text-muted-foreground">
                              {e.advanceDeducted > 0 && `Adv: ${fmt(e.advanceDeducted)}`}
                              {e.absenceDeduction > 0 && ` · Abs(${e.absenceDays}d): ${fmt(e.absenceDeduction)}`}
                              {e.invoiceDeducted > 0 && ` · Inv: ${fmt(e.invoiceDeducted)}`}
                            </span>
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-blue-600 text-base">Rs {fmt(e.netSalary)}</td>
                      <td className="px-4 py-3 text-center">
                        {e.isProcessed
                          ? <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Processed</span>
                          : <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">Not Started</span>
                        }
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t-2 border-border bg-muted/20">
                <tr>
                  <td className="px-4 py-3 font-bold">Total Pending</td>
                  <td className="px-4 py-3 text-right font-bold">Rs {fmt(unpaidEmployees.reduce((s, e) => s + e.baseSalary, 0))}</td>
                  <td />
                  <td />
                  <td className="px-4 py-3 text-right font-bold text-red-500">— Rs {fmt(unpaidEmployees.reduce((s, e) => s + e.advanceDeducted + e.absenceDeduction + e.invoiceDeducted, 0))}</td>
                  <td className="px-4 py-3 text-right font-bold text-blue-600 text-base">Rs {fmt(data.summary.totalPending)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {paidEmployees.length > 0 && (
        <div>
          <p className="text-sm font-semibold mb-2 text-emerald-700">Paid Employees</p>
          <div className="bg-background rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-emerald-50/50 border-b border-border">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Employee</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Base</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Deduction</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Net Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paidEmployees.map(e => (
                  <tr key={e.id} className="hover:bg-muted/20 opacity-70">
                    <td className="px-4 py-2.5">
                      <p className="font-medium">{e.name}</p>
                      {e.designation && <p className="text-xs text-muted-foreground">{e.designation}</p>}
                    </td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground">Rs {fmt(e.baseSalary)}</td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground">{e.advanceDeducted > 0 ? `— Rs ${fmt(e.advanceDeducted)}` : "—"}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-emerald-600">Rs {fmt(e.netSalary)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data.employees.length === 0 && (
        <p className="text-center py-12 text-muted-foreground">No active employees found.</p>
      )}
    </div>
  );
}
