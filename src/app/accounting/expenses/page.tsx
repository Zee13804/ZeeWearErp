"use client";

import React, { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Dialog, FormField, ConfirmDialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { apiGet, apiPost, apiDelete } from "@/lib/api";
import { showToast } from "@/components/ui/toast";
import { Plus, Trash2, Loader2, Eye, Upload } from "lucide-react";

interface Category { id: number; name: string; type: string; _count?: { expenses: number }; }
interface Account { id: number; name: string; }
interface Expense {
  id: number;
  description: string;
  amount: number;
  category: { name: string };
  account: { name: string };
  collection?: string;
  billImage?: string;
  expenseDate: string;
}

type Tab = "expenses" | "categories";
function fmt(n: number) { return n.toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }

const catTypes = [
  { label: "Production", value: "production" },
  { label: "Utilities", value: "utilities" },
  { label: "Transport", value: "transport" },
  { label: "Marketing", value: "marketing" },
  { label: "Maintenance", value: "maintenance" },
  { label: "Office", value: "office" },
  { label: "Other", value: "other" },
];

export default function ExpensesPage() {
  const [tab, setTab] = useState<Tab>("expenses");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; type: "expense" | "category"; name: string } | null>(null);
  const [uploadingBill, setUploadingBill] = useState<number | null>(null);
  const [billTargetId, setBillTargetId] = useState<number | null>(null);
  const billInputRef = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState({ categoryId: "", dateFrom: "", dateTo: "" });

  const [expenseForm, setExpenseForm] = useState({ categoryId: "", accountId: "", amount: "", description: "", collection: "", expenseDate: "" });
  const [categoryForm, setCategoryForm] = useState({ name: "", type: "other" });

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.categoryId) params.set("categoryId", filter.categoryId);
      if (filter.dateFrom) params.set("dateFrom", filter.dateFrom);
      if (filter.dateTo) params.set("dateTo", filter.dateTo);
      const [expRes, catRes, accRes] = await Promise.all([
        apiGet(`/accounting/expenses${params.toString() ? "?" + params : ""}`),
        apiGet("/accounting/expenses/categories"),
        apiGet("/accounting/accounts"),
      ]);
      setExpenses(expRes.expenses || []);
      setCategories(catRes.categories || []);
      setAccounts(accRes.accounts || []);
    } catch { showToast("Failed to load", "error"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filter]);

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.categoryId || !expenseForm.accountId || !expenseForm.amount || !expenseForm.description) {
      showToast("All fields are required", "error"); return;
    }
    setSaving(true);
    try {
      await apiPost("/accounting/expenses", expenseForm);
      showToast("Expense recorded", "success");
      setShowExpenseForm(false);
      setExpenseForm({ categoryId: "", accountId: "", amount: "", description: "", collection: "", expenseDate: "" });
      load();
    } catch (err: unknown) { showToast((err as Error).message || "Failed", "error"); }
    finally { setSaving(false); }
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.name) { showToast("Name required", "error"); return; }
    setSaving(true);
    try {
      await apiPost("/accounting/expenses/categories", categoryForm);
      showToast("Category created", "success");
      setShowCategoryForm(false);
      setCategoryForm({ name: "", type: "other" });
      load();
    } catch (err: unknown) { showToast((err as Error).message || "Failed", "error"); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      if (deleteTarget.type === "expense") await apiDelete(`/accounting/expenses/${deleteTarget.id}`);
      else await apiDelete(`/accounting/expenses/categories/${deleteTarget.id}`);
      showToast("Deleted", "success");
      setDeleteTarget(null);
      load();
    } catch (err: unknown) { showToast((err as Error).message || "Failed", "error"); }
    finally { setSaving(false); }
  };

  const uploadBill = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !billTargetId) return;
    setUploadingBill(billTargetId);
    try {
      const formData = new FormData();
      formData.append("bill", file);
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/accounting/expenses/${billTargetId}/bill`, {
        method: "POST",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      showToast("Bill uploaded", "success");
      load();
    } catch { showToast("Failed to upload bill", "error"); }
    finally { setUploadingBill(null); setBillTargetId(null); if (billInputRef.current) billInputRef.current.value = ""; }
  };

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <DashboardLayout>
      <input ref={billInputRef} type="file" accept="image/*" className="hidden" onChange={uploadBill} />
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Expenses</h1>
            <p className="text-sm text-muted-foreground">Track business expenses with bill uploads</p>
          </div>
          <div className="flex gap-2">
            {tab === "categories" && <Button size="sm" onClick={() => setShowCategoryForm(true)} className="gap-2 cursor-pointer"><Plus className="w-4 h-4" /> Add Category</Button>}
            {tab === "expenses" && <Button size="sm" onClick={() => setShowExpenseForm(true)} className="gap-2 cursor-pointer"><Plus className="w-4 h-4" /> Add Expense</Button>}
          </div>
        </div>

        <div className="flex gap-2 border-b border-border pb-2">
          {(["expenses", "categories"] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-1.5 text-sm rounded-lg font-medium capitalize transition-colors cursor-pointer ${tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              {t}
            </button>
          ))}
        </div>

        {tab === "expenses" && (
          <div className="flex flex-wrap gap-3 bg-background rounded-xl border border-border p-3">
            <Select value={filter.categoryId} onChange={val => setFilter({ ...filter, categoryId: val})} options={[{ label: "All Categories", value: "" }, ...categories.map(c => ({ label: c.name, value: String(c.id) }))]} className="min-w-[150px]" />
            <Input type="date" value={filter.dateFrom} onChange={e => setFilter({ ...filter, dateFrom: e.target.value })} className="max-w-[150px]" />
            <Input type="date" value={filter.dateTo} onChange={e => setFilter({ ...filter, dateTo: e.target.value })} className="max-w-[150px]" />
            <button onClick={() => setFilter({ categoryId: "", dateFrom: "", dateTo: "" })} className="text-xs text-muted-foreground hover:text-foreground cursor-pointer">Clear</button>
          </div>
        )}

        {loading ? <div className="flex justify-center py-12"><Loader2 className="w-7 h-7 animate-spin text-muted-foreground" /></div>
          : tab === "expenses" ? (
            <>
              <div className="bg-background rounded-xl border border-border p-4 flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Total Expenses Shown</span>
                <span className="text-xl font-bold text-red-600">Rs {fmt(totalExpenses)}</span>
              </div>
              {expenses.length === 0 ? <div className="text-center py-12 text-muted-foreground">No expenses recorded.</div> : (
                <div className="bg-background rounded-xl border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 border-b border-border">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Description</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Category</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Account</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Collection</th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">Amount</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {expenses.map(exp => (
                        <tr key={exp.id} className="hover:bg-muted/30">
                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{new Date(exp.expenseDate).toLocaleDateString()}</td>
                          <td className="px-4 py-3 font-medium">{exp.description}</td>
                          <td className="px-4 py-3 text-muted-foreground">{exp.category.name}</td>
                          <td className="px-4 py-3 text-muted-foreground">{exp.account.name}</td>
                          <td className="px-4 py-3 text-muted-foreground">{exp.collection || "—"}</td>
                          <td className="px-4 py-3 text-right font-semibold text-red-600">Rs {fmt(exp.amount)}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => { setBillTargetId(exp.id); billInputRef.current?.click(); }} disabled={uploadingBill === exp.id} className="p-1.5 rounded-md hover:bg-blue-50 cursor-pointer" title="Upload Bill">
                                {uploadingBill === exp.id ? <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" /> : <Upload className="w-3.5 h-3.5 text-blue-600" />}
                              </button>
                              {exp.billImage && <a href={`/api${exp.billImage}`} target="_blank" rel="noreferrer" className="p-1.5 rounded-md hover:bg-green-50"><Eye className="w-3.5 h-3.5 text-green-600" /></a>}
                              <button onClick={() => setDeleteTarget({ id: exp.id, type: "expense", name: exp.description })} className="p-1.5 rounded-md hover:bg-red-50 cursor-pointer"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            categories.length === 0 ? <div className="text-center py-12 text-muted-foreground">No categories yet.</div> : (
              <div className="bg-background rounded-xl border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Category</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Expenses</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {categories.map(cat => (
                      <tr key={cat.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium">{cat.name}</td>
                        <td className="px-4 py-3 text-muted-foreground capitalize">{cat.type}</td>
                        <td className="px-4 py-3 text-right">{cat._count?.expenses || 0}</td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => setDeleteTarget({ id: cat.id, type: "category", name: cat.name })} className="p-1.5 rounded-md hover:bg-red-50 cursor-pointer"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
      </div>

      <Dialog open={showExpenseForm} onClose={() => setShowExpenseForm(false)} title="Add Expense" description="Record a business expense">
        <form onSubmit={handleExpenseSubmit} className="space-y-3">
          <FormField label="Category" required>
            <Select value={expenseForm.categoryId} onChange={val => setExpenseForm({ ...expenseForm, categoryId: val})} options={[{ label: "Select category", value: "" }, ...categories.map(c => ({ label: c.name, value: String(c.id) }))]} />
          </FormField>
          <FormField label="Pay From Account" required>
            <Select value={expenseForm.accountId} onChange={val => setExpenseForm({ ...expenseForm, accountId: val})} options={[{ label: "Select account", value: "" }, ...accounts.map(a => ({ label: a.name, value: String(a.id) }))]} />
          </FormField>
          <FormField label="Amount" required><Input type="number" value={expenseForm.amount} onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })} placeholder="0.00" min="0.01" step="0.01" /></FormField>
          <FormField label="Description" required><Input value={expenseForm.description} onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })} placeholder="What was this expense for?" /></FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Collection"><Input value={expenseForm.collection} onChange={e => setExpenseForm({ ...expenseForm, collection: e.target.value })} placeholder="e.g. Eid 2026" /></FormField>
            <FormField label="Date"><Input type="date" value={expenseForm.expenseDate} onChange={e => setExpenseForm({ ...expenseForm, expenseDate: e.target.value })} /></FormField>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => setShowExpenseForm(false)} className="cursor-pointer">Cancel</Button>
            <Button type="submit" disabled={saving} className="cursor-pointer">{saving ? "Saving..." : "Record"}</Button>
          </div>
        </form>
      </Dialog>

      <Dialog open={showCategoryForm} onClose={() => setShowCategoryForm(false)} title="Add Category" description="Create expense category">
        <form onSubmit={handleCategorySubmit} className="space-y-3">
          <FormField label="Name" required><Input value={categoryForm.name} onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })} placeholder="Category name" /></FormField>
          <FormField label="Type"><Select value={categoryForm.type} onChange={val => setCategoryForm({ ...categoryForm, type: val})} options={catTypes} /></FormField>
          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => setShowCategoryForm(false)} className="cursor-pointer">Cancel</Button>
            <Button type="submit" disabled={saving} className="cursor-pointer">{saving ? "Saving..." : "Create"}</Button>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Confirm Delete" message={`Delete "${deleteTarget?.name}"?`} loading={saving} />
    </DashboardLayout>
  );
}
