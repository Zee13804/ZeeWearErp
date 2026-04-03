"use client";

import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Dialog, FormField, ConfirmDialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";
import { showToast } from "@/components/ui/toast";
import { isAdmin } from "@/lib/auth";
import { Plus, Edit2, Trash2, ArrowLeftRight, Loader2, Wallet, Eye, TrendingUp, TrendingDown, ArrowLeft } from "lucide-react";

const accountTypes = [
  { label: "Cash", value: "cash" },
  { label: "Bank", value: "bank" },
  { label: "Mobile Wallet", value: "wallet" },
  { label: "Other", value: "other" },
];

const typeIcon: Record<string, string> = { cash: "💵", bank: "🏦", wallet: "📱", other: "🪙" };

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

interface LedgerEntry {
  id: string;
  date: string;
  type: "credit" | "debit";
  description: string;
  amount: number;
  note?: string;
  runningBalance: number;
}

interface AccountLedger {
  account: { id: number; name: string; type: string; openingBalance: number };
  openingBalance: number;
  ledger: LedgerEntry[];
  closingBalance: number;
}

function fmt(n: number) {
  return n.toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function AccountsPage() {
  const canDelete = isAdmin();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"accounts" | "transfers">("accounts");

  const [ledgerAccount, setLedgerAccount] = useState<AccountLedger | null>(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerDateFrom, setLedgerDateFrom] = useState("");
  const [ledgerDateTo, setLedgerDateTo] = useState("");

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

  const loadLedger = async (accountId: number) => {
    setLedgerLoading(true);
    try {
      const params = new URLSearchParams();
      if (ledgerDateFrom) params.set("dateFrom", ledgerDateFrom);
      if (ledgerDateTo) params.set("dateTo", ledgerDateTo);
      const res = await apiGet(`/accounting/accounts/${accountId}/ledger?${params}`);
      setLedgerAccount(res);
    } catch {
      showToast("Failed to load ledger", "error");
    } finally {
      setLedgerLoading(false);
    }
  };

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

  const openLedger = (acc: Account) => {
    setLedgerAccount(null);
    setLedgerDateFrom("");
    setLedgerDateTo("");
    // Load the ledger
    setLedgerLoading(true);
    apiGet(`/accounting/accounts/${acc.id}/ledger`).then(res => {
      setLedgerAccount(res);
      setLedgerLoading(false);
    }).catch(() => {
      showToast("Failed to load ledger", "error");
      setLedgerLoading(false);
    });
  };

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);

  // If viewing ledger, show ledger view
  if (ledgerAccount !== null || ledgerLoading) {
    const acc = ledgerAccount?.account;
    const credits = ledgerAccount?.ledger.filter(e => e.type === "credit").reduce((s, e) => s + e.amount, 0) || 0;
    const debits = ledgerAccount?.ledger.filter(e => e.type === "debit").reduce((s, e) => s + e.amount, 0) || 0;

    return (
      <DashboardLayout>
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <button onClick={() => setLedgerAccount(null)} className="p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                {acc ? `${typeIcon[acc.type] || "🪙"} ${acc.name}` : "Account Ledger"}
              </h1>
              <p className="text-sm text-muted-foreground capitalize">{acc?.type} account — transaction history</p>
            </div>
          </div>

          {/* Date filter */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">From:</span>
              <Input type="date" value={ledgerDateFrom} onChange={e => setLedgerDateFrom(e.target.value)} className="w-[150px]" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">To:</span>
              <Input type="date" value={ledgerDateTo} onChange={e => setLedgerDateTo(e.target.value)} className="w-[150px]" />
            </div>
            <Button size="sm" variant="outline" className="cursor-pointer" onClick={() => acc && loadLedger(acc.id)}>Apply</Button>
            <Button size="sm" variant="outline" className="cursor-pointer" onClick={() => { setLedgerDateFrom(""); setLedgerDateTo(""); if (acc) loadLedger(acc.id); }}>Reset</Button>
          </div>

          {/* Summary cards */}
          {ledgerAccount && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-background border border-border rounded-xl p-4">
                <p className="text-xs text-muted-foreground">Opening Balance</p>
                <p className="text-lg font-bold mt-1">Rs {fmt(ledgerAccount.openingBalance)}</p>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900 rounded-xl p-4">
                <p className="text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Total Inflow</p>
                <p className="text-lg font-bold mt-1 text-emerald-700 dark:text-emerald-400">Rs {fmt(credits)}</p>
              </div>
              <div className="bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900 rounded-xl p-4">
                <p className="text-xs text-red-700 dark:text-red-400 flex items-center gap-1"><TrendingDown className="w-3 h-3" /> Total Outflow</p>
                <p className="text-lg font-bold mt-1 text-red-700 dark:text-red-400">Rs {fmt(debits)}</p>
              </div>
              <div className={`border rounded-xl p-4 ${ledgerAccount.closingBalance >= 0 ? "bg-background border-border" : "bg-red-50 dark:bg-red-950/30 border-red-100 dark:border-red-900"}`}>
                <p className="text-xs text-muted-foreground">Closing Balance</p>
                <p className={`text-lg font-bold mt-1 ${ledgerAccount.closingBalance >= 0 ? "text-foreground" : "text-red-600"}`}>
                  Rs {fmt(ledgerAccount.closingBalance)}
                </p>
              </div>
            </div>
          )}

          {ledgerLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-7 h-7 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="bg-background rounded-xl border border-border overflow-hidden">
              {!ledgerAccount || ledgerAccount.ledger.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">No transactions in this period.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 border-b border-border">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Description</th>
                        <th className="text-right px-4 py-3 font-medium text-emerald-600">Credit (+)</th>
                        <th className="text-right px-4 py-3 font-medium text-red-600">Debit (−)</th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      <tr className="bg-muted/20">
                        <td className="px-4 py-2 text-xs text-muted-foreground">Opening</td>
                        <td className="px-4 py-2 text-xs text-muted-foreground">Opening Balance</td>
                        <td className="px-4 py-2 text-right text-xs text-muted-foreground">—</td>
                        <td className="px-4 py-2 text-right text-xs text-muted-foreground">—</td>
                        <td className="px-4 py-2 text-right text-xs font-medium">Rs {fmt(ledgerAccount.openingBalance)}</td>
                      </tr>
                      {ledgerAccount.ledger.map(entry => (
                        <tr key={entry.id} className="hover:bg-muted/30">
                          <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                            {new Date(entry.date).toLocaleDateString("en-PK")}
                          </td>
                          <td className="px-4 py-2.5">
                            <p className="font-medium text-foreground">{entry.description}</p>
                            {entry.note && <p className="text-xs text-muted-foreground">{entry.note}</p>}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            {entry.type === "credit" ? (
                              <span className="font-semibold text-emerald-600">Rs {fmt(entry.amount)}</span>
                            ) : "—"}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            {entry.type === "debit" ? (
                              <span className="font-semibold text-red-600">Rs {fmt(entry.amount)}</span>
                            ) : "—"}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <span className={`font-bold ${entry.runningBalance >= 0 ? "text-foreground" : "text-red-600"}`}>
                              Rs {fmt(entry.runningBalance)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </DashboardLayout>
    );
  }

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
                <span className="text-sm font-medium text-muted-foreground">Total Balance (All Accounts)</span>
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
                  <div key={acc.id} className="bg-background rounded-xl border border-border p-4 flex flex-col">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-2">
                        <span className="text-xl">{typeIcon[acc.type] || "🪙"}</span>
                        <div>
                          <p className="font-semibold text-foreground">{acc.name}</p>
                          <p className="text-xs text-muted-foreground capitalize mt-0.5">{acc.type}</p>
                          {acc.description && <p className="text-xs text-muted-foreground mt-1">{acc.description}</p>}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(acc)} className="p-1.5 rounded-md hover:bg-muted transition-colors cursor-pointer" title="Edit"><Edit2 className="w-3.5 h-3.5 text-muted-foreground" /></button>
                        {canDelete && <button onClick={() => setDeleteTarget(acc)} className="p-1.5 rounded-md hover:bg-red-50 transition-colors cursor-pointer" title="Delete"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>}
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
                    <div className="mt-3">
                      <button
                        onClick={() => openLedger(acc)}
                        className="w-full flex items-center justify-center gap-2 text-xs text-primary border border-primary/30 hover:bg-primary/5 rounded-lg py-2 transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" /> View Transactions
                      </button>
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
                        {canDelete && <button onClick={() => deleteTransfer(t.id)} className="p-1.5 rounded-md hover:bg-red-50 cursor-pointer"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>}
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
            <Select value={form.type} onChange={val => setForm({ ...form, type: val })} options={accountTypes} />
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
            <Select value={transferForm.fromAccountId} onChange={val => setTransferForm({ ...transferForm, fromAccountId: val })}
              options={[{ label: "Select account", value: "" }, ...accounts.map(a => ({ label: `${typeIcon[a.type] || "🪙"} ${a.name} (Rs ${fmt(a.balance)})`, value: String(a.id) }))]} />
          </FormField>
          <FormField label="To Account" required>
            <Select value={transferForm.toAccountId} onChange={val => setTransferForm({ ...transferForm, toAccountId: val })}
              options={[{ label: "Select account", value: "" }, ...accounts.map(a => ({ label: `${typeIcon[a.type] || "🪙"} ${a.name}`, value: String(a.id) }))]} />
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
