"use client";

import React, { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Dialog, FormField, ConfirmDialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { showToast } from "@/components/ui/toast";
import {
  Truck, Plus, Trash2, ChevronDown, ChevronUp, ReceiptText,
  PackageCheck, AlertCircle, Loader2,
} from "lucide-react";
import { isAdmin } from "@/lib/auth";

interface Account { id: number; name: string; }
interface CourierPayment {
  id: number;
  source: "leopard" | "laam";
  shopifyOrderNos?: string;
  grossAmount: number;
  serviceCharge: number;
  netReceived: number;
  paymentRef?: string;
  account: { id: number; name: string };
  paymentDate: string;
  notes?: string;
  createdAt: string;
}
interface Summary {
  leopard: { count: number; totalGross: number; totalServiceCharge: number; totalNetReceived: number };
  laam: { count: number; totalGross: number; totalNetReceived: number };
  combined: { totalNetReceived: number; totalServiceCharge: number };
}

function fmt(n: number) {
  return n.toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

const emptyForm = {
  source: "leopard" as "leopard" | "laam",
  shopifyOrderNos: "",
  grossAmount: "",
  serviceCharge: "",
  netReceived: "",
  paymentRef: "",
  accountId: "",
  paymentDate: new Date().toISOString().split("T")[0],
  notes: "",
};

export default function CourierPaymentsPage() {
  const [payments, setPayments] = useState<CourierPayment[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sourceFilter, setSourceFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; label: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const token = () => localStorage.getItem("token") || "";
  const api = (path: string) => `/api/accounting/courier-payments${path}`;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, aRes, sRes] = await Promise.all([
        fetch(api(""), { headers: { Authorization: `Bearer ${token()}` } }),
        fetch("/api/accounting/accounts", { headers: { Authorization: `Bearer ${token()}` } }),
        fetch(api("/summary"), { headers: { Authorization: `Bearer ${token()}` } }),
      ]);
      const [pData, aData, sData] = await Promise.all([pRes.json(), aRes.json(), sRes.json()]);
      setPayments(pData.payments || []);
      setAccounts(aData.accounts || []);
      setSummary(sData.summary || null);
    } catch {
      showToast("Failed to load payments", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleGrossChange = (val: string) => {
    const gross = parseFloat(val) || 0;
    const charge = parseFloat(form.serviceCharge) || 0;
    setForm(f => ({ ...f, grossAmount: val, netReceived: String(Math.max(0, gross - charge)) }));
  };

  const handleChargeChange = (val: string) => {
    const charge = parseFloat(val) || 0;
    const gross = parseFloat(form.grossAmount) || 0;
    setForm(f => ({ ...f, serviceCharge: val, netReceived: String(Math.max(0, gross - charge)) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.accountId) { showToast("Please select an account", "error"); return; }
    if (!form.grossAmount && !form.netReceived) { showToast("Amount is required", "error"); return; }

    setSaving(true);
    try {
      const res = await fetch(api(""), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({
          source: form.source,
          shopifyOrderNos: form.source === "leopard" ? form.shopifyOrderNos : undefined,
          grossAmount: parseFloat(form.grossAmount) || 0,
          serviceCharge: form.source === "leopard" ? (parseFloat(form.serviceCharge) || 0) : 0,
          netReceived: form.netReceived !== "" ? parseFloat(form.netReceived) : (parseFloat(form.grossAmount) || 0),
          paymentRef: form.paymentRef || undefined,
          accountId: parseInt(form.accountId),
          paymentDate: form.paymentDate,
          notes: form.notes || undefined,
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed"); }
      showToast("Payment recorded", "success");
      setShowForm(false);
      setForm(emptyForm);
      load();
    } catch (err: unknown) {
      showToast((err as Error).message || "Failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(api(`/${deleteTarget.id}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed"); }
      showToast("Payment deleted", "success");
      setDeleteTarget(null);
      load();
    } catch (err: unknown) {
      showToast((err as Error).message || "Failed", "error");
    } finally {
      setDeleting(false);
    }
  };

  const filtered = sourceFilter === "all" ? payments : payments.filter(p => p.source === sourceFilter);

  const adminUser = isAdmin();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Courier Payments</h1>
            <p className="text-muted-foreground mt-1">Track Leopard COD remittances and LAAM platform payments</p>
          </div>
          <button
            onClick={() => { setForm(emptyForm); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Record Payment
          </button>
        </div>

        {summary && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-background rounded-xl border border-border p-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Truck className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Leopard Net Received</p>
                  <p className="text-2xl font-bold text-foreground">Rs {fmt(summary.leopard.totalNetReceived)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{summary.leopard.count} entries</p>
                </div>
              </div>
            </div>
            <div className="bg-background rounded-xl border border-border p-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Leopard Charges</p>
                  <p className="text-2xl font-bold text-red-600">Rs {fmt(summary.leopard.totalServiceCharge)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Service &amp; tax deducted</p>
                </div>
              </div>
            </div>
            <div className="bg-background rounded-xl border border-border p-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                  <PackageCheck className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">LAAM Net Received</p>
                  <p className="text-2xl font-bold text-foreground">Rs {fmt(summary.laam.totalNetReceived)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{summary.laam.count} entries</p>
                </div>
              </div>
            </div>
            <div className="bg-background rounded-xl border border-border p-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                  <ReceiptText className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Net Received</p>
                  <p className="text-2xl font-bold text-emerald-600">Rs {fmt(summary.combined.totalNetReceived)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Leopard + LAAM combined</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          {["all", "leopard", "laam"].map(s => (
            <button
              key={s}
              onClick={() => setSourceFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize cursor-pointer ${
                sourceFilter === s
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >
              {s === "all" ? "All" : s === "leopard" ? "Leopard" : "LAAM"}
            </button>
          ))}
        </div>

        <div className="bg-background rounded-xl border border-border overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <AlertCircle className="w-8 h-8 text-muted-foreground" />
              <p className="text-muted-foreground">No payments recorded yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map(p => (
                <div key={p.id}>
                  <div className="flex items-center justify-between px-4 py-3 hover:bg-muted/30">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <button
                        onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                        className="cursor-pointer flex-shrink-0"
                      >
                        {expandedId === p.id
                          ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                          : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      </button>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            p.source === "leopard"
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                              : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                          }`}>
                            {p.source === "leopard" ? "Leopard" : "LAAM"}
                          </span>
                          {p.paymentRef && (
                            <span className="text-sm text-muted-foreground">Ref: {p.paymentRef}</span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {new Date(p.paymentDate).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{p.account.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="text-right">
                        <p className="font-bold text-emerald-600">+Rs {fmt(p.netReceived)}</p>
                        {p.serviceCharge > 0 && (
                          <p className="text-xs text-red-500">-Rs {fmt(p.serviceCharge)} charges</p>
                        )}
                      </div>
                      {adminUser && (
                        <button
                          onClick={() => setDeleteTarget({ id: p.id, label: `${p.source === "leopard" ? "Leopard" : "LAAM"} payment on ${new Date(p.paymentDate).toLocaleDateString()}` })}
                          className="p-1.5 rounded-md hover:bg-red-50 cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        </button>
                      )}
                    </div>
                  </div>

                  {expandedId === p.id && (
                    <div className="px-10 pb-4 pt-1 bg-muted/20">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">Gross Amount</p>
                          <p className="font-medium">Rs {fmt(p.grossAmount)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Service Charge</p>
                          <p className="font-medium text-red-600">Rs {fmt(p.serviceCharge)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Net Received</p>
                          <p className="font-bold text-emerald-600">Rs {fmt(p.netReceived)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Account</p>
                          <p className="font-medium">{p.account.name}</p>
                        </div>
                        {p.shopifyOrderNos && (
                          <div className="col-span-2 sm:col-span-4">
                            <p className="text-xs text-muted-foreground">Shopify Orders</p>
                            <p className="font-medium text-xs">{p.shopifyOrderNos}</p>
                          </div>
                        )}
                        {p.notes && (
                          <div className="col-span-2 sm:col-span-4">
                            <p className="text-xs text-muted-foreground">Notes</p>
                            <p className="text-sm">{p.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={showForm} onClose={() => setShowForm(false)} title="Record Courier Payment" description="Add a Leopard or LAAM payment entry">
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Source" required>
            <Select
              value={form.source}
              onChange={val => setForm(f => ({ ...f, source: val as "leopard" | "laam", shopifyOrderNos: "", serviceCharge: "", netReceived: f.grossAmount ? String(parseFloat(f.grossAmount) || 0) : "" }))}
              options={[
                { label: "Leopard (COD Courier)", value: "leopard" },
                { label: "LAAM (Platform)", value: "laam" },
              ]}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Payment Date">
              <Input type="date" value={form.paymentDate} onChange={e => setForm(f => ({ ...f, paymentDate: e.target.value }))} />
            </FormField>
            <FormField label="Account" required>
              <Select
                value={form.accountId}
                onChange={val => setForm(f => ({ ...f, accountId: val }))}
                options={[{ label: "Select account", value: "" }, ...accounts.map(a => ({ label: a.name, value: String(a.id) }))]}
              />
            </FormField>
          </div>

          {form.source === "leopard" ? (
            <>
              <FormField label="Shopify Order Numbers">
                <Input
                  value={form.shopifyOrderNos}
                  onChange={e => setForm(f => ({ ...f, shopifyOrderNos: e.target.value }))}
                  placeholder="e.g. #1001, #1002, #1003"
                />
              </FormField>
              <div className="grid grid-cols-3 gap-3">
                <FormField label="Gross COD Amount" required>
                  <Input type="number" value={form.grossAmount} onChange={e => handleGrossChange(e.target.value)} placeholder="0" min="0" step="any" />
                </FormField>
                <FormField label="Service / Tax Charge">
                  <Input type="number" value={form.serviceCharge} onChange={e => handleChargeChange(e.target.value)} placeholder="0" min="0" step="any" />
                </FormField>
                <FormField label="Net Received">
                  <Input type="number" value={form.netReceived} onChange={e => setForm(f => ({ ...f, netReceived: e.target.value }))} placeholder="Auto" min="0" step="any" />
                </FormField>
              </div>
              <FormField label="Remittance Ref (optional)">
                <Input value={form.paymentRef} onChange={e => setForm(f => ({ ...f, paymentRef: e.target.value }))} placeholder="Leopard remittance reference" />
              </FormField>
            </>
          ) : (
            <>
              <FormField label="Payment Reference Number">
                <Input value={form.paymentRef} onChange={e => setForm(f => ({ ...f, paymentRef: e.target.value }))} placeholder="LAAM payment ref" />
              </FormField>
              <FormField label="Amount Received" required>
                <Input
                  type="number"
                  value={form.grossAmount}
                  onChange={e => setForm(f => ({ ...f, grossAmount: e.target.value, netReceived: e.target.value }))}
                  placeholder="0"
                  min="0"
                  step="any"
                />
              </FormField>
            </>
          )}

          <FormField label="Notes (optional)">
            <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any additional notes" />
          </FormField>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted cursor-pointer">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60 cursor-pointer">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Record Payment"}
            </button>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Payment"
        message={`Delete "${deleteTarget?.label}"? This will reverse its effect on the account balance.`}
        confirmLabel="Delete"
        loading={deleting}
      />
    </DashboardLayout>
  );
}
