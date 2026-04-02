"use client";

import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { apiGet } from "@/lib/api";
import { showToast } from "@/components/ui/toast";
import { Loader2, Download } from "lucide-react";

function fmt(n: number) { return n.toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }
function pct(a: number, b: number) { return b === 0 ? "0%" : Math.round((a / b) * 100) + "%"; }

type ReportTab = "pl" | "ledger" | "suppliers" | "receivables" | "payroll";

const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function AccountingReportsPage() {
  const [tab, setTab] = useState<ReportTab>("pl");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [accounts, setAccounts] = useState<Array<{ id: number; name: string }>>([]);

  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [ledgerFilter, setLedgerFilter] = useState({ accountId: "", dateFrom: "", dateTo: "" });
  const [payrollFilter, setPayrollFilter] = useState({ month: "", year: String(new Date().getFullYear()) });

  useEffect(() => {
    apiGet("/accounting/accounts").then(r => setAccounts(r.accounts || [])).catch(() => {});
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
        res = await apiGet("/accounting/reports/suppliers");
      } else if (tab === "receivables") {
        res = await apiGet("/accounting/reports/receivables");
      } else if (tab === "payroll") {
        const params = new URLSearchParams();
        if (payrollFilter.month) params.set("month", payrollFilter.month);
        if (payrollFilter.year) params.set("year", payrollFilter.year);
        res = await apiGet(`/accounting/reports/payroll?${params}`);
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

  const tabs: { key: ReportTab; label: string }[] = [
    { key: "pl", label: "Profit & Loss" },
    { key: "ledger", label: "Cash Ledger" },
    { key: "suppliers", label: "Supplier Balances" },
    { key: "receivables", label: "Receivables" },
    { key: "payroll", label: "Payroll" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-foreground">Financial Reports</h1>
          <p className="text-sm text-muted-foreground">Comprehensive accounting reports</p>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-border pb-2">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`px-4 py-1.5 text-sm rounded-lg font-medium transition-colors cursor-pointer ${tab === t.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {(tab === "pl" || tab === "ledger" || tab === "payroll") && (
          <div className="flex flex-wrap items-end gap-3 bg-background rounded-xl border border-border p-3">
            {tab === "pl" && (
              <>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">From</p>
                  <Input type="date" value={dateRange.from} onChange={e => setDateRange({ ...dateRange, from: e.target.value })} className="w-[150px]" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">To</p>
                  <Input type="date" value={dateRange.to} onChange={e => setDateRange({ ...dateRange, to: e.target.value })} className="w-[150px]" />
                </div>
              </>
            )}
            {tab === "ledger" && (
              <>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Account</p>
                  <Select value={ledgerFilter.accountId} onChange={val => setLedgerFilter({ ...ledgerFilter, accountId: val})} options={[{ label: "All Accounts", value: "" }, ...accounts.map(a => ({ label: a.name, value: String(a.id) }))]} className="w-[160px]" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">From</p>
                  <Input type="date" value={ledgerFilter.dateFrom} onChange={e => setLedgerFilter({ ...ledgerFilter, dateFrom: e.target.value })} className="w-[150px]" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">To</p>
                  <Input type="date" value={ledgerFilter.dateTo} onChange={e => setLedgerFilter({ ...ledgerFilter, dateTo: e.target.value })} className="w-[150px]" />
                </div>
              </>
            )}
            {tab === "payroll" && (
              <>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Month</p>
                  <Select value={payrollFilter.month} onChange={val => setPayrollFilter({ ...payrollFilter, month: val})} options={[{ label: "All", value: "" }, ...months.map((m, i) => ({ label: m, value: String(i + 1) }))]} className="w-[120px]" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Year</p>
                  <Input type="number" value={payrollFilter.year} onChange={e => setPayrollFilter({ ...payrollFilter, year: e.target.value })} min="2020" max="2030" className="w-[100px]" />
                </div>
              </>
            )}
            <Button size="sm" onClick={load} className="cursor-pointer">Apply</Button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
        ) : !data ? null : tab === "pl" ? (
          <PLReport data={data as PLData} onExport={exportCSV} />
        ) : tab === "ledger" ? (
          <LedgerReport data={data as LedgerData} onExport={exportCSV} />
        ) : tab === "suppliers" ? (
          <SupplierReport data={data as SupplierData} onExport={exportCSV} />
        ) : tab === "receivables" ? (
          <ReceivableReport data={data as ReceivableData} onExport={exportCSV} />
        ) : tab === "payroll" ? (
          <PayrollReport data={data as PayrollData} />
        ) : null}
      </div>
    </DashboardLayout>
  );
}

interface PLData {
  from: string; to: string;
  revenue: number; expenses: number; expenseBreakdown: Array<{ category: string; amount: number }>;
  supplierPurchases: number; labourPayments: number; salaries: number;
  totalCosts: number; netProfit: number;
}

function PLReport({ data, onExport }: { data: PLData; onExport: (rows: unknown[][], file: string) => void }) {
  const rows: [string, string][] = [
    ["Item", "Amount (Rs)"],
    ["Revenue (Payments Received)", String(data.revenue)],
    ["—", "—"],
    ["Supplier Purchases", String(data.supplierPurchases)],
    ...data.expenseBreakdown.map(e => [`Expense: ${e.category}`, String(e.amount)] as [string, string]),
    ["Labour Payments", String(data.labourPayments)],
    ["Salaries", String(data.salaries)],
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

function PayrollReport({ data }: { data: PayrollData }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatBox label="Total Salaries" value={`Rs ${fmt(data.totalSalaries)}`} color="text-blue-600" />
        <StatBox label="Total Labour" value={`Rs ${fmt(data.totalLabour)}`} color="text-purple-600" />
        <StatBox label="Advances Given" value={`Rs ${fmt(data.totalAdvances)}`} color="text-amber-600" />
        <StatBox label="Outstanding Advances" value={`Rs ${fmt(data.outstandingAdvances)}`} color={data.outstandingAdvances > 0 ? "text-red-600" : "text-emerald-600"} />
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

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-background rounded-xl border border-border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold mt-1 ${color}`}>{value}</p>
    </div>
  );
}
