"use client";

import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Dialog, FormField, ConfirmDialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SearchSelect } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";
import { showToast } from "@/components/ui/toast";
import { isAdmin, isAccountant } from "@/lib/auth";
import { Plus, Trash2, Loader2, CheckCircle, Wallet, Edit2, Search, FileText } from "lucide-react";

interface Account { id: number; name: string; type: string; balance: number; }
interface Employee { id: number; name: string; designation?: string; phone?: string; monthlySalary: number; advanceBalance: number; invoiceOutstanding: number; isActive: boolean; }
interface Advance { id: number; employee: { name: string }; amount: number; repaid: number; reason?: string; advanceDate: string; accountId?: number; }
interface Salary { id: number; employee: { name: string; designation?: string }; month: number; year: number; baseSalary: number; advanceDeducted: number; absenceDays: number; absenceDeduction: number; invoiceDeducted: number; netSalary: number; isPaid: boolean; paidAt?: string; accountId?: number; note?: string; }
interface Labour { id: number; workerName: string; description?: string; amount: number; weekStart?: string; weekEnd?: string; paymentDate: string; accountId?: number; }
interface PendingInvoice { id: number; invoiceNo: string; invoiceDate: string; customerName?: string; totalAmount: number; paidAmount: number; pendingAmount: number; }
interface InvoiceBalance { hasPendingInvoices: boolean; totalInvoiced?: number; totalPaid?: number; outstanding?: number; pendingInvoices?: PendingInvoice[]; }

type Tab = "employees" | "advances" | "salaries" | "labour";
function fmt(n: number) { return n.toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }

const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const accountTypeIcon: Record<string, string> = { cash: "💵", bank: "🏦", wallet: "📱", other: "🪙" };

export default function EmployeesPage() {
  const canDelete = isAdmin();
  const canManageEmployees = isAdmin();
  const [tab, setTab] = useState<Tab>("employees");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [labour, setLabour] = useState<Labour[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [empSearch, setEmpSearch] = useState("");
  const [salarySearch, setSalarySearch] = useState("");
  const [advanceSearch, setAdvanceSearch] = useState("");
  const [invoiceBalance, setInvoiceBalance] = useState<InvoiceBalance | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);

  const [showEmpForm, setShowEmpForm] = useState(false);
  const [editEmp, setEditEmp] = useState<Employee | null>(null);
  const [editForm, setEditForm] = useState({ name: "", designation: "", phone: "", monthlySalary: "" });
  const [showAdvanceForm, setShowAdvanceForm] = useState(false);
  const [showSalaryForm, setShowSalaryForm] = useState(false);
  const [showLabourForm, setShowLabourForm] = useState(false);
  const [repayTarget, setRepayTarget] = useState<Advance | null>(null);
  const [repayAmount, setRepayAmount] = useState("");
  const [markPaidTarget, setMarkPaidTarget] = useState<Salary | null>(null);
  const [markPaidAccountId, setMarkPaidAccountId] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; type: string; name: string } | null>(null);

  const [empForm, setEmpForm] = useState({ name: "", designation: "", phone: "", monthlySalary: "" });
  const [advanceForm, setAdvanceForm] = useState({ employeeId: "", amount: "", reason: "", advanceDate: "", accountId: "" });
  const [salaryForm, setSalaryForm] = useState({
    employeeId: "", month: String(new Date().getMonth() + 1),
    year: String(new Date().getFullYear()), baseSalary: "",
    advanceDeducted: "0", absenceDays: "0", invoiceDeducted: "0", note: "", accountId: "", markPaid: false,
  });
  const [labourForm, setLabourForm] = useState({ workerName: "", description: "", amount: "", weekStart: "", weekEnd: "", paymentDate: "", accountId: "" });

  const accountOptions = [
    { label: "Select account *", value: "" },
    ...accounts.map(a => ({ label: `${accountTypeIcon[a.type] || "🪙"} ${a.name} (Rs ${fmt(a.balance)})`, value: String(a.id) })),
  ];
  const accountOptionsOptional = [
    { label: "Select account", value: "" },
    ...accounts.map(a => ({ label: `${accountTypeIcon[a.type] || "🪙"} ${a.name} (Rs ${fmt(a.balance)})`, value: String(a.id) })),
  ];

  const load = async () => {
    setLoading(true);
    try {
      const [accRes, empRes, advRes, salRes, labRes] = await Promise.all([
        apiGet("/accounting/accounts"),
        apiGet("/accounting/employees"),
        apiGet("/accounting/employees/advances"),
        apiGet("/accounting/employees/salaries"),
        apiGet("/accounting/employees/labour"),
      ]);
      setAccounts(accRes.accounts || []);
      setEmployees(empRes.employees || []);
      setAdvances(advRes.advances || []);
      setSalaries(salRes.salaries || []);
      setLabour(labRes.payments || []);
    } catch { showToast("Failed to load", "error"); }
    finally { setLoading(false); }
  };

  const fetchInvoiceBalance = async (employeeId: string) => {
    if (!employeeId) { setInvoiceBalance(null); return; }
    setLoadingBalance(true);
    try {
      const res = await apiGet(`/accounting/employees/${employeeId}/invoice-balance`);
      setInvoiceBalance(res);
    } catch { setInvoiceBalance(null); }
    finally { setLoadingBalance(false); }
  };

  useEffect(() => { load(); }, []);

  const handleEmpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empForm.name) { showToast("Name required", "error"); return; }
    setSaving(true);
    try {
      await apiPost("/accounting/employees", empForm);
      showToast("Employee added", "success");
      setShowEmpForm(false);
      setEmpForm({ name: "", designation: "", phone: "", monthlySalary: "" });
      load();
    } catch (err: unknown) { showToast((err as Error).message || "Failed", "error"); }
    finally { setSaving(false); }
  };

  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editEmp || !editForm.name) { showToast("Name required", "error"); return; }
    setSaving(true);
    try {
      await apiPut(`/accounting/employees/${editEmp.id}`, editForm);
      showToast("Employee updated", "success");
      setEditEmp(null);
      load();
    } catch (err: unknown) { showToast((err as Error).message || "Failed", "error"); }
    finally { setSaving(false); }
  };

  const handleAdvanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!advanceForm.employeeId || !advanceForm.amount) { showToast("Employee and amount required", "error"); return; }
    if (!advanceForm.accountId) { showToast("Account is required for every advance", "error"); return; }
    setSaving(true);
    try {
      await apiPost("/accounting/employees/advances", advanceForm);
      showToast("Advance recorded", "success");
      setShowAdvanceForm(false);
      setAdvanceForm({ employeeId: "", amount: "", reason: "", advanceDate: "", accountId: "" });
      load();
    } catch (err: unknown) { showToast((err as Error).message || "Failed", "error"); }
    finally { setSaving(false); }
  };

  const handleSalarySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salaryForm.employeeId || !salaryForm.baseSalary) { showToast("Employee and salary required", "error"); return; }
    if (!salaryForm.accountId) { showToast("Account is required for every salary record", "error"); return; }
    setSaving(true);
    try {
      await apiPost("/accounting/employees/salaries", {
        ...salaryForm,
        baseSalary: parseFloat(salaryForm.baseSalary) || 0,
        absenceDays: parseInt(salaryForm.absenceDays) || 0,
        invoiceDeducted: parseFloat(salaryForm.invoiceDeducted) || 0,
      });
      showToast("Salary record created", "success");
      setShowSalaryForm(false);
      setInvoiceBalance(null);
      setSalaryForm({ employeeId: "", month: String(new Date().getMonth() + 1), year: String(new Date().getFullYear()), baseSalary: "", advanceDeducted: "0", absenceDays: "0", invoiceDeducted: "0", note: "", accountId: "", markPaid: false });
      load();
    } catch (err: unknown) { showToast((err as Error).message || "Failed", "error"); }
    finally { setSaving(false); }
  };

  const handleLabourSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!labourForm.workerName || !labourForm.amount) { showToast("Worker name and amount required", "error"); return; }
    if (!labourForm.accountId) { showToast("Account is required for every labour payment", "error"); return; }
    setSaving(true);
    try {
      await apiPost("/accounting/employees/labour", labourForm);
      showToast("Labour payment recorded", "success");
      setShowLabourForm(false);
      setLabourForm({ workerName: "", description: "", amount: "", weekStart: "", weekEnd: "", paymentDate: "", accountId: "" });
      load();
    } catch (err: unknown) { showToast((err as Error).message || "Failed", "error"); }
    finally { setSaving(false); }
  };

  const handleRepay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repayTarget) return;
    const amt = parseFloat(repayAmount);
    if (!amt || amt <= 0) { showToast("Enter a valid repayment amount", "error"); return; }
    const balance = repayTarget.amount - repayTarget.repaid;
    if (amt > balance) { showToast(`Amount exceeds outstanding balance (Rs ${fmt(balance)})`, "error"); return; }
    setSaving(true);
    try {
      await apiPut(`/accounting/employees/advances/${repayTarget.id}/repay`, { repaid: amt });
      showToast("Repayment recorded", "success");
      setRepayTarget(null);
      setRepayAmount("");
      load();
    } catch (err: unknown) { showToast((err as Error).message || "Failed", "error"); }
    finally { setSaving(false); }
  };

  const handleMarkPaid = async () => {
    if (!markPaidTarget) return;
    setSaving(true);
    try {
      await apiPut(`/accounting/employees/salaries/${markPaidTarget.id}/paid`, { accountId: markPaidAccountId || undefined });
      showToast("Salary marked as paid", "success");
      setMarkPaidTarget(null);
      setMarkPaidAccountId("");
      load();
    } catch { showToast("Failed", "error"); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      if (deleteTarget.type === "employee") await apiDelete(`/accounting/employees/${deleteTarget.id}`);
      else if (deleteTarget.type === "advance") await apiDelete(`/accounting/employees/advances/${deleteTarget.id}`);
      else if (deleteTarget.type === "salary") await apiDelete(`/accounting/employees/salaries/${deleteTarget.id}`);
      else if (deleteTarget.type === "labour") await apiDelete(`/accounting/employees/labour/${deleteTarget.id}`);
      showToast("Deleted", "success");
      setDeleteTarget(null);
      load();
    } catch (err: unknown) { showToast((err as Error).message || "Failed", "error"); }
    finally { setSaving(false); }
  };

  // Totals
  const totalAdvancePending = advances.reduce((s, a) => s + (a.amount - a.repaid), 0);
  const totalSalaryPending = salaries.filter(s => !s.isPaid).reduce((s, sal) => s + sal.netSalary, 0);
  const totalLabour = labour.reduce((s, l) => s + l.amount, 0);
  const filteredEmployees = employees.filter(e => {
    if (!empSearch) return true;
    const q = empSearch.toLowerCase();
    return e.name.toLowerCase().includes(q) || (e.designation || "").toLowerCase().includes(q) || (e.phone || "").toLowerCase().includes(q);
  });
  const filteredSalaries = salaries.filter(s => !salarySearch || s.employee.name.toLowerCase().includes(salarySearch.toLowerCase()));
  const filteredAdvances = advances.filter(a => !advanceSearch || a.employee.name.toLowerCase().includes(advanceSearch.toLowerCase()));
  const totalInvoiceOutstanding = employees.reduce((s, e) => s + (e.invoiceOutstanding || 0), 0);

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Employees & Labour</h1>
            <p className="text-sm text-muted-foreground">Payroll, advances and labour payments</p>
          </div>
          <div className="flex gap-2">
            {tab === "employees" && canManageEmployees && <Button size="sm" onClick={() => setShowEmpForm(true)} className="gap-2 cursor-pointer"><Plus className="w-4 h-4" /> Add Employee</Button>}
            {tab === "advances" && <Button size="sm" onClick={() => setShowAdvanceForm(true)} className="gap-2 cursor-pointer"><Plus className="w-4 h-4" /> Record Advance</Button>}
            {tab === "salaries" && <Button size="sm" onClick={() => setShowSalaryForm(true)} className="gap-2 cursor-pointer"><Plus className="w-4 h-4" /> Add Salary</Button>}
            {tab === "labour" && <Button size="sm" onClick={() => setShowLabourForm(true)} className="gap-2 cursor-pointer"><Plus className="w-4 h-4" /> Record Labour</Button>}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-border pb-2">
          {(["employees", "advances", "salaries", "labour"] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-1.5 text-sm rounded-lg font-medium capitalize transition-colors cursor-pointer ${tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              {t}
            </button>
          ))}
        </div>

        {loading ? <div className="flex justify-center py-12"><Loader2 className="w-7 h-7 animate-spin text-muted-foreground" /></div>
          : tab === "employees" ? (
            <>
              {totalInvoiceOutstanding > 0 && (
                <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900 rounded-xl p-3 flex items-center justify-between">
                  <span className="text-sm text-purple-700 dark:text-purple-400 font-medium flex items-center gap-2"><FileText className="w-4 h-4" /> Total Invoice Outstanding (All Employees)</span>
                  <span className="font-bold text-purple-700 dark:text-purple-400">Rs {fmt(totalInvoiceOutstanding)}</span>
                </div>
              )}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={empSearch} onChange={e => setEmpSearch(e.target.value)} placeholder="Search by name, designation, or phone..." className="pl-9" />
              </div>
              {filteredEmployees.length === 0 ? <div className="text-center py-12 text-muted-foreground">{empSearch ? "No employees match your search." : "No employees yet."}</div> : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredEmployees.map(emp => (
                    <div key={emp.id} className="bg-background rounded-xl border border-border p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold">{emp.name}</p>
                          <p className="text-xs text-muted-foreground">{emp.designation || "No designation"}</p>
                          {emp.phone && <p className="text-xs text-muted-foreground">{emp.phone}</p>}
                        </div>
                        <div className="flex items-center gap-1">
                          {canManageEmployees && <button onClick={() => { setEditEmp(emp); setEditForm({ name: emp.name, designation: emp.designation || "", phone: emp.phone || "", monthlySalary: String(emp.monthlySalary) }); }} className="p-1.5 rounded-md hover:bg-blue-50 cursor-pointer"><Edit2 className="w-3.5 h-3.5 text-blue-500" /></button>}
                          {canDelete && <button onClick={() => setDeleteTarget({ id: emp.id, type: "employee", name: emp.name })} className="p-1.5 rounded-md hover:bg-red-50 cursor-pointer"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>}
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-border grid grid-cols-3 gap-2">
                        <div>
                          <p className="text-xs text-muted-foreground">Salary</p>
                          <p className="font-semibold text-foreground text-sm">Rs {fmt(emp.monthlySalary)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Advance Due</p>
                          <p className={`font-semibold text-sm ${emp.advanceBalance > 0 ? "text-amber-600" : "text-emerald-600"}`}>Rs {fmt(emp.advanceBalance)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Invoice Due</p>
                          <p className={`font-semibold text-sm ${(emp.invoiceOutstanding || 0) > 0 ? "text-purple-600" : "text-emerald-600"}`}>Rs {fmt(emp.invoiceOutstanding || 0)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : tab === "advances" ? (
            <>
              {totalAdvancePending > 0 && (
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl p-3 flex items-center justify-between">
                  <span className="text-sm text-amber-700 dark:text-amber-400 font-medium">Total Pending Advances</span>
                  <span className="font-bold text-amber-700 dark:text-amber-400">Rs {fmt(totalAdvancePending)}</span>
                </div>
              )}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={advanceSearch} onChange={e => setAdvanceSearch(e.target.value)} placeholder="Search by employee name..." className="pl-9" />
              </div>
              {filteredAdvances.length === 0 ? <div className="text-center py-12 text-muted-foreground">{advanceSearch ? "No advances match your search." : "No advances recorded."}</div> : (
                <div className="bg-background rounded-xl border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 border-b border-border">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Employee</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Reason</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Account</th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">Amount</th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">Repaid</th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">Balance</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredAdvances.map(a => {
                        const acc = accounts.find(ac => ac.id === a.accountId);
                        return (
                          <tr key={a.id} className="hover:bg-muted/30">
                            <td className="px-4 py-3 text-muted-foreground">{new Date(a.advanceDate).toLocaleDateString()}</td>
                            <td className="px-4 py-3 font-medium">{a.employee.name}</td>
                            <td className="px-4 py-3 text-muted-foreground">{a.reason || "—"}</td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">{acc ? <span className="flex items-center gap-1"><Wallet className="w-3 h-3" />{acc.name}</span> : "—"}</td>
                            <td className="px-4 py-3 text-right font-semibold">Rs {fmt(a.amount)}</td>
                            <td className="px-4 py-3 text-right text-emerald-600">Rs {fmt(a.repaid)}</td>
                            <td className={`px-4 py-3 text-right font-semibold ${a.amount - a.repaid > 0 ? "text-amber-600" : "text-emerald-600"}`}>Rs {fmt(a.amount - a.repaid)}</td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                {a.amount - a.repaid > 0 && (
                                  <button onClick={() => { setRepayTarget(a); setRepayAmount(""); }} className="px-2 py-1 rounded-md text-xs font-medium bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 cursor-pointer">Repay</button>
                                )}
                                {canDelete && <button onClick={() => setDeleteTarget({ id: a.id, type: "advance", name: `Advance for ${a.employee.name}` })} className="p-1.5 rounded-md hover:bg-red-50 cursor-pointer"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : tab === "salaries" ? (
            <>
              {totalSalaryPending > 0 && (
                <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl p-3 flex items-center justify-between">
                  <span className="text-sm text-red-700 dark:text-red-400 font-medium">Unpaid Salary Outstanding</span>
                  <span className="font-bold text-red-700 dark:text-red-400">Rs {fmt(totalSalaryPending)}</span>
                </div>
              )}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={salarySearch} onChange={e => setSalarySearch(e.target.value)} placeholder="Search by employee name..." className="pl-9" />
              </div>
              {filteredSalaries.length === 0 ? <div className="text-center py-12 text-muted-foreground">{salarySearch ? "No salary records match your search." : "No salary records yet."}</div> : (
                <div className="bg-background rounded-xl border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 border-b border-border">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Period</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Employee</th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">Base</th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">Adv. Cut</th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">Absent</th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">Invoice Cut</th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">Net</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Paid From</th>
                        <th className="text-center px-4 py-3 font-medium text-muted-foreground">Status</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredSalaries.map(s => {
                        const acc = accounts.find(ac => ac.id === s.accountId);
                        return (
                          <tr key={s.id} className="hover:bg-muted/30">
                            <td className="px-4 py-3 text-muted-foreground">{months[s.month - 1]} {s.year}</td>
                            <td className="px-4 py-3">
                              <p className="font-medium">{s.employee.name}</p>
                              {s.employee.designation && <p className="text-xs text-muted-foreground">{s.employee.designation}</p>}
                            </td>
                            <td className="px-4 py-3 text-right">Rs {fmt(s.baseSalary)}</td>
                            <td className="px-4 py-3 text-right text-red-500">{s.advanceDeducted > 0 ? `–Rs ${fmt(s.advanceDeducted)}` : "—"}</td>
                            <td className="px-4 py-3 text-right text-orange-500">{s.absenceDays > 0 ? <span title={`${s.absenceDays} days`}>–Rs {fmt(s.absenceDeduction)}</span> : "—"}</td>
                            <td className="px-4 py-3 text-right text-purple-600">{s.invoiceDeducted > 0 ? `–Rs ${fmt(s.invoiceDeducted)}` : "—"}</td>
                            <td className="px-4 py-3 text-right font-bold">Rs {fmt(s.netSalary)}</td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">{acc ? <span className="flex items-center gap-1"><Wallet className="w-3 h-3" />{acc.name}</span> : "—"}</td>
                            <td className="px-4 py-3 text-center">
                              {s.isPaid ? (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 flex items-center gap-1 w-fit mx-auto"><CheckCircle className="w-3 h-3" /> Paid</span>
                              ) : (
                                <button onClick={() => { setMarkPaidTarget(s); setMarkPaidAccountId(""); }} className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 cursor-pointer hover:bg-amber-200 transition-colors">Mark Paid</button>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {canDelete && <button onClick={() => setDeleteTarget({ id: s.id, type: "salary", name: `${s.employee.name} - ${months[s.month - 1]} ${s.year}` })} className="p-1.5 rounded-md hover:bg-red-50 cursor-pointer"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <>
              {totalLabour > 0 && (
                <div className="bg-background border border-border rounded-xl p-3 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground font-medium">Total Labour Payments</span>
                  <span className="font-bold">Rs {fmt(totalLabour)}</span>
                </div>
              )}
              {labour.length === 0 ? <div className="text-center py-12 text-muted-foreground">No labour payments recorded.</div> : (
                <div className="bg-background rounded-xl border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 border-b border-border">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Worker</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Description</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Period</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Account</th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">Amount</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {labour.map(l => {
                        const acc = accounts.find(ac => ac.id === l.accountId);
                        return (
                          <tr key={l.id} className="hover:bg-muted/30">
                            <td className="px-4 py-3 text-muted-foreground">{new Date(l.paymentDate).toLocaleDateString()}</td>
                            <td className="px-4 py-3 font-medium">{l.workerName}</td>
                            <td className="px-4 py-3 text-muted-foreground">{l.description || "—"}</td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">
                              {l.weekStart && l.weekEnd ? `${new Date(l.weekStart).toLocaleDateString()} – ${new Date(l.weekEnd).toLocaleDateString()}` : "—"}
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">{acc ? <span className="flex items-center gap-1"><Wallet className="w-3 h-3" />{acc.name}</span> : "—"}</td>
                            <td className="px-4 py-3 text-right font-semibold text-foreground">Rs {fmt(l.amount)}</td>
                            <td className="px-4 py-3 text-right">
                              {canDelete && <button onClick={() => setDeleteTarget({ id: l.id, type: "labour", name: `Payment to ${l.workerName}` })} className="p-1.5 rounded-md hover:bg-red-50 cursor-pointer"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
      </div>

      {/* Add Employee */}
      <Dialog open={showEmpForm} onClose={() => setShowEmpForm(false)} title="Add Employee" description="Add a new employee">
        <form onSubmit={handleEmpSubmit} className="space-y-3">
          <FormField label="Name" required><Input value={empForm.name} onChange={e => setEmpForm({ ...empForm, name: e.target.value })} placeholder="Full name" /></FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Designation"><Input value={empForm.designation} onChange={e => setEmpForm({ ...empForm, designation: e.target.value })} placeholder="e.g. Tailor, Cutter" /></FormField>
            <FormField label="Phone"><Input value={empForm.phone} onChange={e => setEmpForm({ ...empForm, phone: e.target.value })} placeholder="Phone number" /></FormField>
          </div>
          <FormField label="Monthly Salary (Rs)"><Input type="number" value={empForm.monthlySalary} onChange={e => setEmpForm({ ...empForm, monthlySalary: e.target.value })} placeholder="0" min="0" step="any" /></FormField>
          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => setShowEmpForm(false)} className="cursor-pointer">Cancel</Button>
            <Button type="submit" disabled={saving} className="cursor-pointer">{saving ? "Saving..." : "Add Employee"}</Button>
          </div>
        </form>
      </Dialog>

      {/* Edit Employee */}
      <Dialog open={!!editEmp} onClose={() => setEditEmp(null)} title="Edit Employee" description="Update employee details and salary">
        <form onSubmit={handleUpdateEmployee} className="space-y-3">
          <FormField label="Name" required><Input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} placeholder="Full name" /></FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Designation"><Input value={editForm.designation} onChange={e => setEditForm({ ...editForm, designation: e.target.value })} placeholder="e.g. Tailor, Cutter" /></FormField>
            <FormField label="Phone"><Input value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} placeholder="Phone number" /></FormField>
          </div>
          <FormField label="Monthly Salary (Rs)"><Input type="number" value={editForm.monthlySalary} onChange={e => setEditForm({ ...editForm, monthlySalary: e.target.value })} placeholder="0" min="0" step="any" /></FormField>
          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => setEditEmp(null)} className="cursor-pointer">Cancel</Button>
            <Button type="submit" disabled={saving} className="cursor-pointer">{saving ? "Saving..." : "Update Employee"}</Button>
          </div>
        </form>
      </Dialog>

      {/* Record Advance */}
      <Dialog open={showAdvanceForm} onClose={() => setShowAdvanceForm(false)} title="Record Advance" description="Record advance payment to employee">
        <form onSubmit={handleAdvanceSubmit} className="space-y-3">
          <FormField label="Employee" required>
            <SearchSelect value={advanceForm.employeeId} onChange={val => setAdvanceForm({ ...advanceForm, employeeId: val })} placeholder="Search employee..." options={employees.map(e => ({ label: e.name, value: String(e.id) }))} />
          </FormField>
          <FormField label="Amount (Rs)" required><Input type="number" value={advanceForm.amount} onChange={e => setAdvanceForm({ ...advanceForm, amount: e.target.value })} placeholder="0.00" min="0.01" step="0.01" /></FormField>
          <FormField label="Debit from Account" required>
            <SearchSelect value={advanceForm.accountId} onChange={val => setAdvanceForm({ ...advanceForm, accountId: val })} placeholder="Search account..." options={accountOptions} />
          </FormField>
          <FormField label="Reason"><Input value={advanceForm.reason} onChange={e => setAdvanceForm({ ...advanceForm, reason: e.target.value })} placeholder="Optional reason" /></FormField>
          <FormField label="Date"><Input type="date" value={advanceForm.advanceDate} onChange={e => setAdvanceForm({ ...advanceForm, advanceDate: e.target.value })} /></FormField>
          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => setShowAdvanceForm(false)} className="cursor-pointer">Cancel</Button>
            <Button type="submit" disabled={saving} className="cursor-pointer">{saving ? "Saving..." : "Record"}</Button>
          </div>
        </form>
      </Dialog>

      {/* Salary Record */}
      <Dialog open={showSalaryForm} onClose={() => { setShowSalaryForm(false); setInvoiceBalance(null); }} title="Salary Record" description="Create a monthly salary record">
        <form onSubmit={handleSalarySubmit} className="space-y-3">
          <FormField label="Employee" required>
            <SearchSelect value={salaryForm.employeeId} onChange={val => {
              const emp = employees.find(em => em.id === parseInt(val));
              setSalaryForm({ ...salaryForm, employeeId: val, baseSalary: emp ? String(emp.monthlySalary) : salaryForm.baseSalary, advanceDeducted: emp ? String(emp.advanceBalance) : "0", absenceDays: "0", invoiceDeducted: "0" });
              fetchInvoiceBalance(val);
            }} placeholder="Search employee..." options={employees.map(e => ({ label: `${e.name} (Rs ${fmt(e.monthlySalary)}/mo)`, value: String(e.id) }))} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Month">
              <Select value={salaryForm.month} onChange={val => setSalaryForm({ ...salaryForm, month: val })} options={months.map((m, i) => ({ label: m, value: String(i + 1) }))} />
            </FormField>
            <FormField label="Year"><Input type="number" value={salaryForm.year} onChange={e => setSalaryForm({ ...salaryForm, year: e.target.value })} min="2020" max="2030" /></FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Base Salary" required><Input type="number" value={salaryForm.baseSalary} onChange={e => setSalaryForm({ ...salaryForm, baseSalary: e.target.value })} placeholder="0" min="0" step="any" /></FormField>
            <FormField label="Advance Deducted"><Input type="number" value={salaryForm.advanceDeducted} onChange={e => setSalaryForm({ ...salaryForm, advanceDeducted: e.target.value })} placeholder="0" min="0" step="any" /></FormField>
          </div>

          {/* Absent Days */}
          <div className="border border-border rounded-lg p-3 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Absent Days Deduction</p>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <FormField label="Absent Days">
                  <Input type="number" value={salaryForm.absenceDays} onChange={e => setSalaryForm({ ...salaryForm, absenceDays: e.target.value })} placeholder="0" min="0" max="31" step="1" />
                </FormField>
              </div>
              {salaryForm.baseSalary && parseInt(salaryForm.absenceDays) > 0 && (
                <div className="text-right text-sm pt-4">
                  <p className="text-muted-foreground text-xs">Daily Rate: Rs {fmt((parseFloat(salaryForm.baseSalary) || 0) / 30)}</p>
                  <p className="text-orange-600 font-semibold">–Rs {fmt(((parseFloat(salaryForm.baseSalary) || 0) / 30) * parseInt(salaryForm.absenceDays))}</p>
                </div>
              )}
            </div>
          </div>

          {/* Invoice Deduction */}
          {loadingBalance && <div className="text-xs text-muted-foreground">Loading invoice balance...</div>}
          {!loadingBalance && invoiceBalance && !invoiceBalance.hasPendingInvoices && (invoiceBalance.totalInvoiced || 0) > 0 && (
            <div className="text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded-lg px-3 py-2">
              ✓ Is employee ke saare bills paid hain
            </div>
          )}
          {invoiceBalance?.hasPendingInvoices && (invoiceBalance.outstanding || 0) > 0 && (
            <div className="border border-purple-200 dark:border-purple-900 rounded-lg p-3 space-y-2 bg-purple-50/50 dark:bg-purple-950/20">
              <p className="text-xs font-semibold text-purple-700 dark:text-purple-400 uppercase tracking-wide">Pending Bills</p>
              {invoiceBalance.pendingInvoices && invoiceBalance.pendingInvoices.length > 0 && (
                <div className="space-y-1">
                  {invoiceBalance.pendingInvoices.map(inv => (
                    <div key={inv.id} className="flex items-center justify-between text-xs bg-purple-100/60 dark:bg-purple-900/30 rounded px-2 py-1">
                      <div>
                        <span className="text-purple-800 dark:text-purple-300 font-medium">{inv.invoiceNo}</span>
                        {inv.customerName && <span className="text-muted-foreground ml-1">({inv.customerName})</span>}
                      </div>
                      <span className="text-muted-foreground">{new Date(inv.invoiceDate).toLocaleDateString("en-PK")}</span>
                      <span className="text-red-600 font-semibold">Rs {fmt(inv.pendingAmount)}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-purple-200 dark:border-purple-800">
                <div><p className="text-muted-foreground">Total Paid</p><p className="font-semibold text-emerald-600">Rs {fmt(invoiceBalance.totalPaid || 0)}</p></div>
                <div><p className="text-muted-foreground">Total Pending</p><p className="font-semibold text-red-600">Rs {fmt(invoiceBalance.outstanding || 0)}</p></div>
              </div>
              <FormField label="Salary se deduct karein (Rs)">
                <Input type="number" value={salaryForm.invoiceDeducted} onChange={e => setSalaryForm({ ...salaryForm, invoiceDeducted: e.target.value })} placeholder="0" min="0" max={invoiceBalance.outstanding} step="any" />
              </FormField>
              {parseFloat(salaryForm.invoiceDeducted) > 0 && (
                <p className="text-xs text-purple-700 dark:text-purple-400">
                  Deduction ke baad remaining: <span className="font-bold">Rs {fmt((invoiceBalance.outstanding || 0) - (parseFloat(salaryForm.invoiceDeducted) || 0))}</span>
                </p>
              )}
            </div>
          )}

          {salaryForm.baseSalary && (
            <div className="p-3 rounded-lg bg-muted/50 text-sm space-y-1">
              {parseInt(salaryForm.absenceDays) > 0 && (
                <p className="text-xs text-muted-foreground">Absence: –Rs {fmt(((parseFloat(salaryForm.baseSalary) || 0) / 30) * parseInt(salaryForm.absenceDays))}</p>
              )}
              {parseFloat(salaryForm.invoiceDeducted) > 0 && (
                <p className="text-xs text-muted-foreground">Invoice Cut: –Rs {fmt(parseFloat(salaryForm.invoiceDeducted))}</p>
              )}
              <p>Net Salary: <span className="font-bold text-foreground">Rs {fmt(
                (parseFloat(salaryForm.baseSalary) || 0)
                - (parseFloat(salaryForm.advanceDeducted) || 0)
                - (parseInt(salaryForm.absenceDays) > 0 ? ((parseFloat(salaryForm.baseSalary) || 0) / 30) * parseInt(salaryForm.absenceDays) : 0)
                - (parseFloat(salaryForm.invoiceDeducted) || 0)
              )}</span></p>
            </div>
          )}
          <FormField label="Pay From Account" required>
            <SearchSelect value={salaryForm.accountId} onChange={val => setSalaryForm({ ...salaryForm, accountId: val })} placeholder="Search account..." options={accountOptions} />
          </FormField>
          <FormField label="Note"><Input value={salaryForm.note} onChange={e => setSalaryForm({ ...salaryForm, note: e.target.value })} placeholder="Optional note" /></FormField>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={salaryForm.markPaid} onChange={e => setSalaryForm({ ...salaryForm, markPaid: e.target.checked })} className="rounded" />
            Mark as Paid immediately
          </label>
          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => { setShowSalaryForm(false); setInvoiceBalance(null); }} className="cursor-pointer">Cancel</Button>
            <Button type="submit" disabled={saving} className="cursor-pointer">{saving ? "Saving..." : "Create"}</Button>
          </div>
        </form>
      </Dialog>

      {/* Labour Payment */}
      <Dialog open={showLabourForm} onClose={() => setShowLabourForm(false)} title="Labour Payment" description="Record weekly labour payment">
        <form onSubmit={handleLabourSubmit} className="space-y-3">
          <FormField label="Worker Name" required><Input value={labourForm.workerName} onChange={e => setLabourForm({ ...labourForm, workerName: e.target.value })} placeholder="Worker's name" /></FormField>
          <FormField label="Description"><Input value={labourForm.description} onChange={e => setLabourForm({ ...labourForm, description: e.target.value })} placeholder="Type of work done" /></FormField>
          <FormField label="Amount (Rs)" required><Input type="number" value={labourForm.amount} onChange={e => setLabourForm({ ...labourForm, amount: e.target.value })} placeholder="0.00" min="0.01" step="0.01" /></FormField>
          <FormField label="Pay From Account" required>
            <SearchSelect value={labourForm.accountId} onChange={val => setLabourForm({ ...labourForm, accountId: val })} placeholder="Search account..." options={accountOptions} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Week Start"><Input type="date" value={labourForm.weekStart} onChange={e => setLabourForm({ ...labourForm, weekStart: e.target.value })} /></FormField>
            <FormField label="Week End"><Input type="date" value={labourForm.weekEnd} onChange={e => setLabourForm({ ...labourForm, weekEnd: e.target.value })} /></FormField>
          </div>
          <FormField label="Payment Date"><Input type="date" value={labourForm.paymentDate} onChange={e => setLabourForm({ ...labourForm, paymentDate: e.target.value })} /></FormField>
          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => setShowLabourForm(false)} className="cursor-pointer">Cancel</Button>
            <Button type="submit" disabled={saving} className="cursor-pointer">{saving ? "Saving..." : "Record"}</Button>
          </div>
        </form>
      </Dialog>

      {/* Mark Salary Paid Dialog */}
      <Dialog open={!!markPaidTarget} onClose={() => setMarkPaidTarget(null)} title="Mark Salary Paid"
        description={markPaidTarget ? `Mark ${markPaidTarget.employee.name}'s salary (${months[markPaidTarget.month - 1]} ${markPaidTarget.year}) as paid` : ""}>
        <div className="space-y-4">
          {markPaidTarget && (
            <div className="p-3 rounded-lg bg-muted/50 text-sm">
              Net Amount: <span className="font-bold">Rs {fmt(markPaidTarget.netSalary)}</span>
            </div>
          )}
          <FormField label="Debit from Account" required>
            <SearchSelect value={markPaidAccountId} onChange={val => setMarkPaidAccountId(val)} placeholder="Search account..." options={accountOptions} />
          </FormField>
          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => setMarkPaidTarget(null)} className="cursor-pointer">Cancel</Button>
            <Button onClick={handleMarkPaid} disabled={saving || !markPaidAccountId} className="cursor-pointer">{saving ? "Saving..." : "Mark as Paid"}</Button>
          </div>
        </div>
      </Dialog>

      {/* Repay Advance Dialog */}
      <Dialog open={!!repayTarget} onClose={() => { setRepayTarget(null); setRepayAmount(""); }} title="Record Repayment"
        description={repayTarget ? `Repay advance for ${repayTarget.employee.name} — Outstanding: Rs ${fmt(repayTarget.amount - repayTarget.repaid)}` : ""}>
        {repayTarget && (
          <form onSubmit={handleRepay} className="space-y-4">
            <FormField label="Repayment Amount (Rs)">
              <Input type="number" min="1" max={repayTarget.amount - repayTarget.repaid} step="0.01" value={repayAmount} onChange={e => setRepayAmount(e.target.value)} placeholder={`Max Rs ${fmt(repayTarget.amount - repayTarget.repaid)}`} required />
            </FormField>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="ghost" onClick={() => { setRepayTarget(null); setRepayAmount(""); }}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Record Repayment"}</Button>
            </div>
          </form>
        )}
      </Dialog>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Confirm Delete" message={`Delete "${deleteTarget?.name}"?`} loading={saving} />
    </DashboardLayout>
  );
}
