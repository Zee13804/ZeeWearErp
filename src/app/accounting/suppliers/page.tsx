"use client";

import React, { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Dialog, FormField, ConfirmDialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { apiGet, apiPost, apiDelete } from "@/lib/api";
import { showToast } from "@/components/ui/toast";
import { isAdmin } from "@/lib/auth";
import { Plus, Trash2, Loader2, Eye, Upload, X, ChevronDown, ChevronUp, BookOpen } from "lucide-react";

interface Supplier {
  id: number;
  name: string;
  company?: string;
  phone?: string;
  email?: string;
  address?: string;
  totalPurchased: number;
  totalPaid: number;
  balance: number;
}

interface Purchase {
  id: number;
  supplierId: number;
  supplier: { name: string };
  invoiceNo?: string;
  description?: string;
  totalAmount: number;
  billImage?: string;
  purchaseDate: string;
  items: Array<{ description: string; quantity: number; unitPrice: number; totalPrice: number }>;
}

interface SupplierPayment {
  id: number;
  supplierId: number;
  supplier: { name: string };
  account: { name: string };
  amount: number;
  note?: string;
  paymentDate: string;
}

interface Account { id: number; name: string; }

function fmt(n: number) { return n.toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }

type Tab = "suppliers" | "purchases" | "payments";

export default function SuppliersPage() {
  const canDelete = isAdmin();
  const [tab, setTab] = useState<Tab>("suppliers");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [payments, setPayments] = useState<SupplierPayment[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [showPurchaseForm, setShowPurchaseForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; type: string; name: string } | null>(null);
  const [expandedPurchase, setExpandedPurchase] = useState<number | null>(null);
  const [uploadingBill, setUploadingBill] = useState<number | null>(null);
  const billInputRef = useRef<HTMLInputElement>(null);
  const [billTargetId, setBillTargetId] = useState<number | null>(null);
  const [supplierLedger, setSupplierLedger] = useState<{ supplier: { id: number; name: string; phone?: string }; ledger: Array<{ date: string; type: string; description: string; amount: number; runningBalance: number }>; totalPurchased: number; totalPaid: number; balance: number } | null>(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  const [supplierForm, setSupplierForm] = useState({ name: "", company: "", phone: "", email: "", address: "" });
  const [purchaseForm, setPurchaseForm] = useState({
    supplierId: "", invoiceNo: "", description: "", totalAmount: "", purchaseDate: "",
    items: [{ description: "", quantity: "1", unitPrice: "", totalPrice: "" }],
  });
  const [paymentForm, setPaymentForm] = useState({ supplierId: "", accountId: "", amount: "", note: "", paymentDate: "" });

  const load = async () => {
    setLoading(true);
    try {
      const [sRes, pRes, pyRes, accRes] = await Promise.all([
        apiGet("/accounting/suppliers"),
        apiGet("/accounting/suppliers/purchases"),
        apiGet("/accounting/suppliers/payments"),
        apiGet("/accounting/accounts"),
      ]);
      setSuppliers(sRes.suppliers || []);
      setPurchases(pRes.purchases || []);
      setPayments(pyRes.payments || []);
      setAccounts(accRes.accounts || []);
    } catch { showToast("Failed to load data", "error"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierForm.name) { showToast("Supplier name required", "error"); return; }
    setSaving(true);
    try {
      await apiPost("/accounting/suppliers", supplierForm);
      showToast("Supplier created", "success");
      setShowSupplierForm(false);
      setSupplierForm({ name: "", company: "", phone: "", email: "", address: "" });
      load();
    } catch (err: unknown) { showToast((err as Error).message || "Failed", "error"); }
    finally { setSaving(false); }
  };

  const updatePurchaseItem = (idx: number, field: string, val: string) => {
    const items = [...purchaseForm.items];
    items[idx] = { ...items[idx], [field]: val };
    if (field === "quantity" || field === "unitPrice") {
      const q = parseFloat(items[idx].quantity) || 0;
      const u = parseFloat(items[idx].unitPrice) || 0;
      items[idx].totalPrice = String(Math.round(q * u * 100) / 100);
    }
    const total = items.reduce((s, i) => s + (parseFloat(i.totalPrice) || 0), 0);
    setPurchaseForm({ ...purchaseForm, items, totalAmount: String(Math.round(total * 100) / 100) });
  };

  const handlePurchaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchaseForm.supplierId || !purchaseForm.totalAmount) { showToast("Supplier and total amount required", "error"); return; }
    setSaving(true);
    try {
      await apiPost("/accounting/suppliers/purchases", {
        ...purchaseForm,
        items: purchaseForm.items.filter(i => i.description),
      });
      showToast("Purchase recorded", "success");
      setShowPurchaseForm(false);
      setPurchaseForm({ supplierId: "", invoiceNo: "", description: "", totalAmount: "", purchaseDate: "", items: [{ description: "", quantity: "1", unitPrice: "", totalPrice: "" }] });
      load();
    } catch (err: unknown) { showToast((err as Error).message || "Failed", "error"); }
    finally { setSaving(false); }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentForm.supplierId || !paymentForm.accountId || !paymentForm.amount) { showToast("All payment fields required", "error"); return; }
    setSaving(true);
    try {
      await apiPost("/accounting/suppliers/payments", paymentForm);
      showToast("Payment recorded", "success");
      setShowPaymentForm(false);
      setPaymentForm({ supplierId: "", accountId: "", amount: "", note: "", paymentDate: "" });
      load();
    } catch (err: unknown) { showToast((err as Error).message || "Failed", "error"); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      if (deleteTarget.type === "supplier") await apiDelete(`/accounting/suppliers/${deleteTarget.id}`);
      else if (deleteTarget.type === "purchase") await apiDelete(`/accounting/suppliers/purchases/${deleteTarget.id}`);
      else if (deleteTarget.type === "payment") await apiDelete(`/accounting/suppliers/payments/${deleteTarget.id}`);
      showToast("Deleted successfully", "success");
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
      const res = await fetch(`/api/accounting/suppliers/purchases/${billTargetId}/bill`, {
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

  const viewLedger = async (supplierId: number) => {
    setLedgerLoading(true);
    setSupplierLedger(null);
    try {
      const data = await apiGet(`/accounting/suppliers/${supplierId}/ledger`);
      setSupplierLedger(data);
    } catch { showToast("Failed to load supplier ledger", "error"); }
    finally { setLedgerLoading(false); }
  };

  const totalDebt = suppliers.reduce((s, sup) => s + sup.balance, 0);

  return (
    <DashboardLayout>
      <input ref={billInputRef} type="file" accept="image/*" className="hidden" onChange={uploadBill} />
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Suppliers</h1>
            <p className="text-sm text-muted-foreground">Manage supplier purchases and payments</p>
          </div>
          <div className="flex gap-2">
            {tab === "suppliers" && <Button size="sm" onClick={() => setShowSupplierForm(true)} className="gap-2 cursor-pointer"><Plus className="w-4 h-4" /> Add Supplier</Button>}
            {tab === "purchases" && <Button size="sm" onClick={() => setShowPurchaseForm(true)} className="gap-2 cursor-pointer"><Plus className="w-4 h-4" /> Add Purchase</Button>}
            {tab === "payments" && <Button size="sm" onClick={() => setShowPaymentForm(true)} className="gap-2 cursor-pointer"><Plus className="w-4 h-4" /> Record Payment</Button>}
          </div>
        </div>

        <div className="flex gap-2 border-b border-border pb-2">
          {(["suppliers", "purchases", "payments"] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-1.5 text-sm rounded-lg font-medium capitalize transition-colors cursor-pointer ${tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              {t}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-7 h-7 animate-spin text-muted-foreground" /></div>
        ) : tab === "suppliers" ? (
          <>
            <div className="bg-background rounded-xl border border-border p-4 flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Total Supplier Debt</span>
              <span className={`text-xl font-bold ${totalDebt > 0 ? "text-red-600" : "text-emerald-600"}`}>Rs {fmt(totalDebt)}</span>
            </div>
            {suppliers.length === 0 ? <div className="text-center py-12 text-muted-foreground">No suppliers yet.</div> : (
              <div className="bg-background rounded-xl border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Supplier</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Purchased</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Paid</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Balance</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {suppliers.map(s => (
                      <tr key={s.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <p className="font-medium">{s.name}</p>
                          {s.phone && <p className="text-xs text-muted-foreground">{s.phone}</p>}
                          {s.company && <p className="text-xs text-muted-foreground">{s.company}</p>}
                        </td>
                        <td className="px-4 py-3 text-right">Rs {fmt(s.totalPurchased)}</td>
                        <td className="px-4 py-3 text-right text-emerald-600">Rs {fmt(s.totalPaid)}</td>
                        <td className={`px-4 py-3 text-right font-semibold ${s.balance > 0 ? "text-red-600" : "text-emerald-600"}`}>Rs {fmt(s.balance)}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => viewLedger(s.id)} className="p-1.5 rounded-md hover:bg-blue-50 cursor-pointer" title="View Ledger"><BookOpen className="w-3.5 h-3.5 text-blue-500" /></button>
                            {canDelete && <button onClick={() => setDeleteTarget({ id: s.id, type: "supplier", name: s.name })} className="p-1.5 rounded-md hover:bg-red-50 cursor-pointer"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : tab === "purchases" ? (
          purchases.length === 0 ? <div className="text-center py-12 text-muted-foreground">No purchases recorded yet.</div> : (
            <div className="space-y-2">
              {purchases.map(p => (
                <div key={p.id} className="bg-background rounded-xl border border-border overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <button onClick={() => setExpandedPurchase(expandedPurchase === p.id ? null : p.id)} className="cursor-pointer">
                        {expandedPurchase === p.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      </button>
                      <div>
                        <p className="font-medium">{p.supplier.name} {p.invoiceNo && <span className="text-muted-foreground text-xs">#{p.invoiceNo}</span>}</p>
                        <p className="text-xs text-muted-foreground">{new Date(p.purchaseDate).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="font-bold text-foreground">Rs {fmt(p.totalAmount)}</p>
                      <button onClick={() => { setBillTargetId(p.id); billInputRef.current?.click(); }} disabled={uploadingBill === p.id} className="p-1.5 rounded-md hover:bg-blue-50 cursor-pointer" title="Upload Bill">
                        {uploadingBill === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" /> : <Upload className="w-3.5 h-3.5 text-blue-600" />}
                      </button>
                      {p.billImage && <a href={`/api${p.billImage}`} target="_blank" rel="noreferrer" className="p-1.5 rounded-md hover:bg-green-50"><Eye className="w-3.5 h-3.5 text-green-600" /></a>}
                      {canDelete && <button onClick={() => setDeleteTarget({ id: p.id, type: "purchase", name: `Purchase from ${p.supplier.name}` })} className="p-1.5 rounded-md hover:bg-red-50 cursor-pointer"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>}
                    </div>
                  </div>
                  {expandedPurchase === p.id && p.items.length > 0 && (
                    <div className="border-t border-border bg-muted/20 px-4 py-3">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Items</p>
                      <table className="w-full text-xs">
                        <thead><tr className="text-muted-foreground"><th className="text-left pb-1">Description</th><th className="text-right pb-1">Qty</th><th className="text-right pb-1">Unit</th><th className="text-right pb-1">Total</th></tr></thead>
                        <tbody className="divide-y divide-border/50">
                          {p.items.map((item, idx) => (
                            <tr key={idx}><td className="py-1">{item.description}</td><td className="text-right py-1">{item.quantity}</td><td className="text-right py-1">Rs {fmt(item.unitPrice)}</td><td className="text-right py-1 font-medium">Rs {fmt(item.totalPrice)}</td></tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        ) : (
          payments.length === 0 ? <div className="text-center py-12 text-muted-foreground">No payments recorded yet.</div> : (
            <div className="bg-background rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Supplier</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Account</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Amount</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Note</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {payments.map(p => (
                    <tr key={p.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 text-muted-foreground">{new Date(p.paymentDate).toLocaleDateString()}</td>
                      <td className="px-4 py-3 font-medium">{p.supplier.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.account.name}</td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-600">Rs {fmt(p.amount)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.note || "—"}</td>
                      <td className="px-4 py-3 text-right">
                        {canDelete && <button onClick={() => setDeleteTarget({ id: p.id, type: "payment", name: `Payment of Rs ${fmt(p.amount)}` })} className="p-1.5 rounded-md hover:bg-red-50 cursor-pointer"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      <Dialog open={showSupplierForm} onClose={() => setShowSupplierForm(false)} title="Add Supplier" description="Create a new supplier">
        <form onSubmit={handleSupplierSubmit} className="space-y-3">
          <FormField label="Name" required><Input value={supplierForm.name} onChange={e => setSupplierForm({ ...supplierForm, name: e.target.value })} placeholder="Supplier name" /></FormField>
          <FormField label="Company"><Input value={supplierForm.company} onChange={e => setSupplierForm({ ...supplierForm, company: e.target.value })} placeholder="Company name" /></FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Phone"><Input value={supplierForm.phone} onChange={e => setSupplierForm({ ...supplierForm, phone: e.target.value })} placeholder="Phone" /></FormField>
            <FormField label="Email"><Input value={supplierForm.email} onChange={e => setSupplierForm({ ...supplierForm, email: e.target.value })} placeholder="Email" /></FormField>
          </div>
          <FormField label="Address"><Input value={supplierForm.address} onChange={e => setSupplierForm({ ...supplierForm, address: e.target.value })} placeholder="Address" /></FormField>
          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => setShowSupplierForm(false)} className="cursor-pointer">Cancel</Button>
            <Button type="submit" disabled={saving} className="cursor-pointer">{saving ? "Saving..." : "Create"}</Button>
          </div>
        </form>
      </Dialog>

      <Dialog open={showPurchaseForm} onClose={() => setShowPurchaseForm(false)} title="Record Purchase" description="Add a supplier credit purchase">
        <form onSubmit={handlePurchaseSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Supplier" required>
              <Select value={purchaseForm.supplierId} onChange={val => setPurchaseForm({ ...purchaseForm, supplierId: val})} options={[{ label: "Select supplier", value: "" }, ...suppliers.map(s => ({ label: s.name, value: String(s.id) }))]} />
            </FormField>
            <FormField label="Invoice No"><Input value={purchaseForm.invoiceNo} onChange={e => setPurchaseForm({ ...purchaseForm, invoiceNo: e.target.value })} placeholder="Optional" /></FormField>
          </div>
          <FormField label="Purchase Date">
            <Input type="date" value={purchaseForm.purchaseDate} onChange={e => setPurchaseForm({ ...purchaseForm, purchaseDate: e.target.value })} />
          </FormField>
          <FormField label="Description">
            <Input value={purchaseForm.description} onChange={e => setPurchaseForm({ ...purchaseForm, description: e.target.value })} placeholder="General description" />
          </FormField>
          <div className="space-y-2">
            <p className="text-sm font-medium">Items</p>
            {purchaseForm.items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-5"><Input value={item.description} onChange={e => updatePurchaseItem(idx, "description", e.target.value)} placeholder="Description" /></div>
                <div className="col-span-2"><Input type="number" value={item.quantity} onChange={e => updatePurchaseItem(idx, "quantity", e.target.value)} placeholder="Qty" min="0.01" step="any" /></div>
                <div className="col-span-2"><Input type="number" value={item.unitPrice} onChange={e => updatePurchaseItem(idx, "unitPrice", e.target.value)} placeholder="Price" min="0" step="any" /></div>
                <div className="col-span-2"><Input type="number" value={item.totalPrice} readOnly placeholder="Total" /></div>
                <div className="col-span-1">
                  {idx > 0 && <button type="button" onClick={() => { const items = purchaseForm.items.filter((_, i) => i !== idx); const total = items.reduce((s, i) => s + (parseFloat(i.totalPrice) || 0), 0); setPurchaseForm({ ...purchaseForm, items, totalAmount: String(total) }); }} className="cursor-pointer"><X className="w-4 h-4 text-red-500" /></button>}
                </div>
              </div>
            ))}
            <button type="button" onClick={() => setPurchaseForm({ ...purchaseForm, items: [...purchaseForm.items, { description: "", quantity: "1", unitPrice: "", totalPrice: "" }] })} className="text-xs text-primary hover:underline cursor-pointer">+ Add Item</button>
          </div>
          <FormField label="Total Amount" required>
            <Input type="number" value={purchaseForm.totalAmount} onChange={e => setPurchaseForm({ ...purchaseForm, totalAmount: e.target.value })} placeholder="0.00" min="0" step="0.01" />
          </FormField>
          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => setShowPurchaseForm(false)} className="cursor-pointer">Cancel</Button>
            <Button type="submit" disabled={saving} className="cursor-pointer">{saving ? "Saving..." : "Record"}</Button>
          </div>
        </form>
      </Dialog>

      <Dialog open={showPaymentForm} onClose={() => setShowPaymentForm(false)} title="Record Supplier Payment" description="Pay a supplier">
        <form onSubmit={handlePaymentSubmit} className="space-y-3">
          <FormField label="Supplier" required>
            <Select value={paymentForm.supplierId} onChange={val => setPaymentForm({ ...paymentForm, supplierId: val})} options={[{ label: "Select supplier", value: "" }, ...suppliers.map(s => ({ label: `${s.name} (Rs ${fmt(s.balance)} due)`, value: String(s.id) }))]} />
          </FormField>
          <FormField label="Pay From Account" required>
            <Select value={paymentForm.accountId} onChange={val => setPaymentForm({ ...paymentForm, accountId: val})} options={[{ label: "Select account", value: "" }, ...accounts.map(a => ({ label: a.name, value: String(a.id) }))]} />
          </FormField>
          <FormField label="Amount" required><Input type="number" value={paymentForm.amount} onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })} placeholder="0.00" min="0.01" step="0.01" /></FormField>
          <FormField label="Date"><Input type="date" value={paymentForm.paymentDate} onChange={e => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })} /></FormField>
          <FormField label="Note"><Input value={paymentForm.note} onChange={e => setPaymentForm({ ...paymentForm, note: e.target.value })} placeholder="Optional note" /></FormField>
          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => setShowPaymentForm(false)} className="cursor-pointer">Cancel</Button>
            <Button type="submit" disabled={saving} className="cursor-pointer">{saving ? "Saving..." : "Record"}</Button>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Confirm Delete" message={`Delete "${deleteTarget?.name}"?`} loading={saving} />

      <Dialog open={!!supplierLedger || ledgerLoading} onClose={() => setSupplierLedger(null)} title={supplierLedger ? `Ledger — ${supplierLedger.supplier.name}` : "Loading Ledger..."} className="max-w-3xl">
        {ledgerLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : supplierLedger ? (
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="bg-background border border-border rounded-lg p-3 flex-1 text-center"><p className="text-xs text-muted-foreground">Total Purchased</p><p className="font-bold text-sm mt-1">Rs {fmt(supplierLedger.totalPurchased)}</p></div>
              <div className="bg-background border border-border rounded-lg p-3 flex-1 text-center"><p className="text-xs text-muted-foreground">Total Paid</p><p className="font-bold text-sm mt-1 text-emerald-600">Rs {fmt(supplierLedger.totalPaid)}</p></div>
              <div className="bg-background border border-border rounded-lg p-3 flex-1 text-center"><p className="text-xs text-muted-foreground">Balance Due</p><p className={`font-bold text-sm mt-1 ${supplierLedger.balance > 0 ? "text-red-600" : "text-emerald-600"}`}>Rs {fmt(supplierLedger.balance)}</p></div>
            </div>
            <div className="bg-background rounded-xl border border-border overflow-hidden max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b border-border sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Date</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Description</th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground">Debit</th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground">Credit</th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {supplierLedger.ledger.map((row, i) => (
                    <tr key={i} className="hover:bg-muted/20">
                      <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{new Date(row.date).toLocaleDateString()}</td>
                      <td className="px-3 py-2">{row.description}</td>
                      <td className="px-3 py-2 text-right text-red-600">{row.type === "debit" ? `Rs ${fmt(row.amount)}` : "—"}</td>
                      <td className="px-3 py-2 text-right text-emerald-600">{row.type === "credit" ? `Rs ${fmt(row.amount)}` : "—"}</td>
                      <td className={`px-3 py-2 text-right font-semibold ${row.runningBalance > 0 ? "text-red-600" : "text-emerald-600"}`}>Rs {fmt(row.runningBalance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {supplierLedger.ledger.length === 0 && <p className="text-center py-8 text-muted-foreground">No transactions found</p>}
            </div>
          </div>
        ) : null}
      </Dialog>
    </DashboardLayout>
  );
}
