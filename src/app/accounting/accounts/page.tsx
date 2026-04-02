"use client";

import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Dialog, FormField, ConfirmDialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";
import { showToast } from "@/components/ui/toast";
import { Plus, Edit2, Trash2, ArrowLeftRight, Loader2, Wallet } from "lucide-react";

const accountTypes = [
  { label: "Cash", value: "cash" },
  { label: "Bank", value: "bank" },
  { label: "Mobile Wallet", value: "wallet" },
  { label: "Other", value: "other" },
];

interface Account {
  id: number;
  name: string;
  type: string;
  description?: string;
  openingBalance: number;
  balance: number;
}

interface Transfer {
  id: number;
  fromAccount: { id: number; name: string };
  toAccount: { id: number; name: string };
  amount: number;
  note?: string;
  date: string;
}

function fmt(n: number) {
  return n.toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"accounts" | "transfers">("accounts");

  const [form, setForm] = useState({ name: "", type: "cash", description: "", openingBalance: "" });
  const [transferForm, setTransferForm] = useState({ fromAccountId: "", toAccountId: "", amount: "", note: "", date: "" });

  const load = async () => {
    setLoading(true);
    try {
      const [accRes, tRes] = await Promise.all([
        apiGet("/accounting/accounts"),
        apiGet("/accounting/accounts/transfers"),
      ]);
      setAccounts(accRes.accounts || []);
      setTransfers(tRes.transfers || []);
    } catch {
      showToast("Failed to load accounts", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setForm({ name: "", type: "cash", description: "", openingBalance: "" });
    setEditing(null);
    setShowForm(true);
  };

  const openEdit = (acc: Account) => {
    setForm({ name: acc.name, type: acc.type, description: acc.description || "", openingBalance: String(acc.openingBalance) });
    setEditing(acc);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) { showToast("Account name is required", "error"); return; }
    setSaving(true);
    try {
      if (editing) {
        await apiPut(`/accounting/accounts/${editing.id}`, form);
        showToast("Account updated", "success");
      } else {
        await apiPost("/accounting/accounts", form);
        showToast("Account created", "success");
      }
      setShowForm(false);
      load();
    } catch (err: unknown) {
      showToast((err as Error).message || "Failed to save", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await apiDelete(`/accounting/accounts/${deleteTarget.id}`);
      showToast("Account deleted", "success");
      setDeleteTarget(null);
      load();
    } catch (err: unknown) {
      showToast((err as Error).message || "Failed to delete", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferForm.fromAccountId || !transferForm.toAccountId || !transferForm.amount) {
      showToast("All transfer fields are required", "error"); return;
    }
    setSaving(true);
    try {
      await apiPost("/accounting/accounts/transfers", transferForm);
      showToast("Transfer recorded", "success");
      setShowTransfer(false);
      setTransferForm({ fromAccountId: "", toAccountId: "", amount: "", note: "", date: "" });
      load();
    } catch (err: unknown) {
      showToast((err as Error).message || "Failed to transfer", "error");
    } finally {
      setSaving(false);
    }
  };

  const deleteTransfer = async (id: number) => {
    try {
      await apiDelete(`/accounting/accounts/transfers/${id}`);
      showToast("Transfer deleted", "success");
      load();
    } catch {
      showToast("Failed to delete transfer", "error");
    }
  };

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Accounts</h1>
            <p className="text-sm text-muted-foreground">Manage cash, bank and wallet accounts</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowTransfer(true)} className="gap-2 cursor-pointer">
              <ArrowLeftRight className="w-4 h-4" /> Transfer
            </Button>
            <Button size="sm" onClick={openCreate} className="gap-2 cursor-pointer">
              <Plus className="w-4 h-4" /> Add Account
            </Button>
          </div>
        </div>

        <div className="flex gap-2 border-b border-border pb-2">
          {(["accounts", "transfers"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-1.5 text-sm rounded-lg font-medium capitalize transition-colors cursor-pointer ${tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              {t}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-7 h-7 animate-spin text-muted-foreground" /></div>
        ) : tab === "accounts" ? (
          <>
            <div className="bg-background rounded-xl border border-border p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Total Balance</span>
              </div>
              <span className={`text-xl font-bold ${totalBalance >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                Rs {fmt(totalBalance)}
              </span>
            </div>

            {accounts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">No accounts yet. Create your first account.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {accounts.map(acc => (
                  <div key={acc.id} className="bg-background rounded-xl border border-border p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-foreground">{acc.name}</p>
                        <p className="text-xs text-muted-foreground capitalize mt-0.5">{acc.type}</p>
                        {acc.description && <p className="text-xs text-muted-foreground mt-1">{acc.description}</p>}
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(acc)} className="p-1.5 rounded-md hover:bg-muted transition-colors cursor-pointer"><Edit2 className="w-3.5 h-3.5 text-muted-foreground" /></button>
                        <button onClick={() => setDeleteTarget(acc)} className="p-1.5 rounded-md hover:bg-red-50 transition-colors cursor-pointer"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-xs text-muted-foreground">Current Balance</p>
                      <p className={`text-2xl font-bold mt-0.5 ${acc.balance >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        Rs {fmt(acc.balance)}
                      </p>
                      {acc.openingBalance > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">Opening: Rs {fmt(acc.openingBalance)}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="bg-background rounded-xl border border-border overflow-hidden">
            {transfers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">No transfers recorded.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">From</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">To</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Amount</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Note</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {transfers.map(t => (
                    <tr key={t.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 text-muted-foreground">{new Date(t.date).toLocaleDateString()}</td>
                      <td className="px-4 py-3 font-medium">{t.fromAccount.name}</td>
                      <td className="px-4 py-3 font-medium">{t.toAccount.name}</td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-600">Rs {fmt(t.amount)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{t.note || "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => deleteTransfer(t.id)} className="p-1.5 rounded-md hover:bg-red-50 cursor-pointer"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      <Dialog open={showForm} onClose={() => setShowForm(false)} title={editing ? "Edit Account" : "New Account"} description="Manage your account details">
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Account Name" required>
            <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Main Cash, HBL Savings" />
          </FormField>
          <FormField label="Type">
            <Select value={form.type} onChange={val => setForm({ ...form, type: val})} options={accountTypes} />
          </FormField>
          <FormField label="Opening Balance">
            <Input type="number" min="0" step="0.01" value={form.openingBalance} onChange={e => setForm({ ...form, openingBalance: e.target.value })} placeholder="0" />
          </FormField>
          <FormField label="Description">
            <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Optional notes" />
          </FormField>
          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="cursor-pointer">Cancel</Button>
            <Button type="submit" disabled={saving} className="cursor-pointer">{saving ? "Saving..." : editing ? "Update" : "Create"}</Button>
          </div>
        </form>
      </Dialog>

      <Dialog open={showTransfer} onClose={() => setShowTransfer(false)} title="Transfer Between Accounts" description="Move funds between accounts">
        <form onSubmit={handleTransfer} className="space-y-4">
          <FormField label="From Account" required>
            <Select value={transferForm.fromAccountId} onChange={val => setTransferForm({ ...transferForm, fromAccountId: val})}
              options={[{ label: "Select account", value: "" }, ...accounts.map(a => ({ label: a.name, value: String(a.id) }))]} />
          </FormField>
          <FormField label="To Account" required>
            <Select value={transferForm.toAccountId} onChange={val => setTransferForm({ ...transferForm, toAccountId: val})}
              options={[{ label: "Select account", value: "" }, ...accounts.map(a => ({ label: a.name, value: String(a.id) }))]} />
          </FormField>
          <FormField label="Amount" required>
            <Input type="number" min="0.01" step="0.01" value={transferForm.amount} onChange={e => setTransferForm({ ...transferForm, amount: e.target.value })} placeholder="0.00" />
          </FormField>
          <FormField label="Date">
            <Input type="date" value={transferForm.date} onChange={e => setTransferForm({ ...transferForm, date: e.target.value })} />
          </FormField>
          <FormField label="Note">
            <Input value={transferForm.note} onChange={e => setTransferForm({ ...transferForm, note: e.target.value })} placeholder="Optional note" />
          </FormField>
          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => setShowTransfer(false)} className="cursor-pointer">Cancel</Button>
            <Button type="submit" disabled={saving} className="cursor-pointer">{saving ? "Saving..." : "Transfer"}</Button>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        title="Delete Account" message={`Delete "${deleteTarget?.name}"? This cannot be undone.`} loading={saving} />
    </DashboardLayout>
  );
}
