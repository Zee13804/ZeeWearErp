"use client";

import React, { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Dialog, FormField, ConfirmDialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { apiGet, apiPost, apiDelete } from "@/lib/api";
import { showToast } from "@/components/ui/toast";
import { Plus, Trash2, Loader2, Eye, Upload, X, ChevronDown, ChevronUp } from "lucide-react";

interface Customer { id: number; name: string; phone?: string; _count?: { invoices: number }; }
interface Account { id: number; name: string; }
interface Variant { id: number; sku: string; size: string; color: string; quantity: number; }

interface Invoice {
  id: number;
  invoiceNo: string;
  customer: { name: string };
  status: string;
  totalAmount: number;
  discount: number;
  paidAmount: number;
  invoiceDate: string;
  billImage?: string;
  items: Array<{ description: string; quantity: number; unitPrice: number; totalPrice: number; variant?: { sku: string } }>;
  payments: Array<{ id: number; amount: number; account: { name: string }; paymentDate: string }>;
}

type Tab = "invoices" | "customers" | "payments";

function fmt(n: number) { return n.toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }

const statusColors: Record<string, string> = {
  paid: "bg-emerald-100 text-emerald-700",
  partial: "bg-amber-100 text-amber-700",
  unpaid: "bg-red-100 text-red-700",
};

export default function InvoicesPage() {
  const [tab, setTab] = useState<Tab>("invoices");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedInvoice, setExpandedInvoice] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [uploadingBill, setUploadingBill] = useState<number | null>(null);
  const billInputRef = useRef<HTMLInputElement>(null);
  const [billTargetId, setBillTargetId] = useState<number | null>(null);

  const [customerForm, setCustomerForm] = useState({ name: "", phone: "", email: "", address: "" });
  const [invoiceForm, setInvoiceForm] = useState({
    customerId: "", discount: "0", note: "", invoiceDate: "", adjustStockOut: false,
    items: [{ description: "", variantId: "", sku: "", quantity: "1", unitPrice: "", totalPrice: "" }],
  });
  const [paymentForm, setPaymentForm] = useState({ invoiceId: "", accountId: "", amount: "", note: "", paymentDate: "" });

  const load = async () => {
    setLoading(true);
    try {
      const [invRes, custRes, accRes, varRes] = await Promise.all([
        apiGet("/accounting/invoices"),
        apiGet("/accounting/invoices/customers"),
        apiGet("/accounting/accounts"),
        apiGet("/variants"),
      ]);
      setInvoices(invRes.invoices || []);
      setCustomers(custRes.customers || []);
      setAccounts(accRes.accounts || []);
      setVariants(varRes.variants || []);
    } catch { showToast("Failed to load data", "error"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const updateItem = (idx: number, field: string, val: string) => {
    const items = [...invoiceForm.items];
    items[idx] = { ...items[idx], [field]: val };
    if (field === "variantId") {
      const v = variants.find(v => v.id === parseInt(val));
      if (v) { items[idx].sku = v.sku; items[idx].description = `${v.sku} - ${v.size} ${v.color}`; }
    }
    if (field === "quantity" || field === "unitPrice") {
      const q = parseFloat(items[idx].quantity) || 0;
      const u = parseFloat(items[idx].unitPrice) || 0;
      items[idx].totalPrice = String(Math.round(q * u * 100) / 100);
    }
    setInvoiceForm({ ...invoiceForm, items });
  };

  const handleCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerForm.name) { showToast("Name required", "error"); return; }
    setSaving(true);
    try {
      await apiPost("/accounting/invoices/customers", customerForm);
      showToast("Customer created", "success");
      setShowCustomerForm(false);
      setCustomerForm({ name: "", phone: "", email: "", address: "" });
      load();
    } catch (err: unknown) { showToast((err as Error).message || "Failed", "error"); }
    finally { setSaving(false); }
  };

  const handleInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceForm.customerId) { showToast("Customer required", "error"); return; }
    const items = invoiceForm.items.filter(i => i.description && i.unitPrice);
    if (!items.length) { showToast("At least one item required", "error"); return; }
    setSaving(true);
    try {
      await apiPost("/accounting/invoices", { ...invoiceForm, items });
      showToast("Invoice created", "success");
      setShowInvoiceForm(false);
      setInvoiceForm({ customerId: "", discount: "0", note: "", invoiceDate: "", adjustStockOut: false, items: [{ description: "", variantId: "", sku: "", quantity: "1", unitPrice: "", totalPrice: "" }] });
      load();
    } catch (err: unknown) { showToast((err as Error).message || "Failed", "error"); }
    finally { setSaving(false); }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentForm.invoiceId || !paymentForm.accountId || !paymentForm.amount) { showToast("All fields required", "error"); return; }
    setSaving(true);
    try {
      await apiPost("/accounting/invoices/payments", paymentForm);
      showToast("Payment recorded", "success");
      setShowPaymentForm(false);
      setPaymentForm({ invoiceId: "", accountId: "", amount: "", note: "", paymentDate: "" });
      load();
    } catch (err: unknown) { showToast((err as Error).message || "Failed", "error"); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await apiDelete(`/accounting/invoices/${deleteTarget.id}`);
      showToast("Invoice deleted", "success");
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
      const res = await fetch(`/api/accounting/invoices/${billTargetId}/bill`, {
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

  const openPayment = (inv: Invoice) => {
    setPaymentForm({ invoiceId: String(inv.id), accountId: "", amount: String(Math.max(0, inv.totalAmount - inv.discount - inv.paidAmount)), note: "", paymentDate: "" });
    setSelectedInvoice(inv);
    setShowPaymentForm(true);
  };

  const totalPending = invoices.filter(i => i.status !== "paid").reduce((s, i) => s + (i.totalAmount - i.discount - i.paidAmount), 0);

  return (
    <DashboardLayout>
      <input ref={billInputRef} type="file" accept="image/*" className="hidden" onChange={uploadBill} />
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Invoices</h1>
            <p className="text-sm text-muted-foreground">Customer invoices and receipts</p>
          </div>
          <div className="flex gap-2">
            {tab === "customers" && <Button size="sm" onClick={() => setShowCustomerForm(true)} className="gap-2 cursor-pointer"><Plus className="w-4 h-4" /> Add Customer</Button>}
            {tab === "invoices" && <Button size="sm" onClick={() => setShowInvoiceForm(true)} className="gap-2 cursor-pointer"><Plus className="w-4 h-4" /> New Invoice</Button>}
            {tab === "payments" && <Button size="sm" onClick={() => { setPaymentForm({ invoiceId: "", accountId: "", amount: "", note: "", paymentDate: "" }); setShowPaymentForm(true); }} className="gap-2 cursor-pointer"><Plus className="w-4 h-4" /> Record Payment</Button>}
          </div>
        </div>

        <div className="flex gap-2 border-b border-border pb-2">
          {(["invoices", "customers", "payments"] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-1.5 text-sm rounded-lg font-medium capitalize transition-colors cursor-pointer ${tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              {t}
            </button>
          ))}
        </div>

        {loading ? <div className="flex justify-center py-12"><Loader2 className="w-7 h-7 animate-spin text-muted-foreground" /></div>
          : tab === "invoices" ? (
            <>
              <div className="bg-background rounded-xl border border-border p-4 flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Total Pending Receivable</span>
                <span className="text-xl font-bold text-amber-600">Rs {fmt(totalPending)}</span>
              </div>
              {invoices.length === 0 ? <div className="text-center py-12 text-muted-foreground">No invoices yet.</div> : (
                <div className="space-y-2">
                  {invoices.map(inv => (
                    <div key={inv.id} className="bg-background rounded-xl border border-border overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-3">
                          <button onClick={() => setExpandedInvoice(expandedInvoice === inv.id ? null : inv.id)} className="cursor-pointer">
                            {expandedInvoice === inv.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                          </button>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold">{inv.invoiceNo}</p>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[inv.status] || ""}`}>{inv.status}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">{inv.customer.name} · {new Date(inv.invoiceDate).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="font-bold">Rs {fmt(inv.totalAmount - inv.discount)}</p>
                            {inv.paidAmount > 0 && <p className="text-xs text-emerald-600">Paid: Rs {fmt(inv.paidAmount)}</p>}
                          </div>
                          <button onClick={() => openPayment(inv)} className="p-1.5 rounded-md hover:bg-green-50 cursor-pointer" title="Record Payment"><Plus className="w-3.5 h-3.5 text-green-600" /></button>
                          <button onClick={() => { setBillTargetId(inv.id); billInputRef.current?.click(); }} disabled={uploadingBill === inv.id} className="p-1.5 rounded-md hover:bg-blue-50 cursor-pointer" title="Upload Bill">
                            {uploadingBill === inv.id ? <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" /> : <Upload className="w-3.5 h-3.5 text-blue-600" />}
                          </button>
                          {inv.billImage && <a href={`/api${inv.billImage}`} target="_blank" rel="noreferrer" className="p-1.5 rounded-md hover:bg-green-50"><Eye className="w-3.5 h-3.5 text-green-600" /></a>}
                          <button onClick={() => setDeleteTarget({ id: inv.id, name: inv.invoiceNo })} className="p-1.5 rounded-md hover:bg-red-50 cursor-pointer"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>
                        </div>
                      </div>
                      {expandedInvoice === inv.id && (
                        <div className="border-t border-border bg-muted/20 px-4 py-3 space-y-3">
                          <table className="w-full text-xs">
                            <thead><tr className="text-muted-foreground"><th className="text-left pb-1">Item</th><th className="text-right pb-1">Qty</th><th className="text-right pb-1">Unit Price</th><th className="text-right pb-1">Total</th></tr></thead>
                            <tbody className="divide-y divide-border/50">
                              {inv.items.map((item, idx) => (
                                <tr key={idx}><td className="py-1">{item.description}{item.variant && <span className="text-muted-foreground ml-1">({item.variant.sku})</span>}</td><td className="text-right py-1">{item.quantity}</td><td className="text-right py-1">Rs {fmt(item.unitPrice)}</td><td className="text-right py-1 font-medium">Rs {fmt(item.totalPrice)}</td></tr>
                              ))}
                            </tbody>
                          </table>
                          {inv.payments.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">Payments</p>
                              {inv.payments.map(p => (
                                <div key={p.id} className="flex justify-between text-xs text-muted-foreground">
                                  <span>{new Date(p.paymentDate).toLocaleDateString()} · {p.account.name}</span>
                                  <span className="font-medium text-emerald-600">Rs {fmt(p.amount)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : tab === "customers" ? (
            customers.length === 0 ? <div className="text-center py-12 text-muted-foreground">No customers yet.</div> : (
              <div className="bg-background rounded-xl border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Customer</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Phone</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Invoices</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {customers.map(c => (
                      <tr key={c.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium">{c.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{c.phone || "—"}</td>
                        <td className="px-4 py-3 text-right">{c._count?.invoices || 0}</td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={async () => { try { await apiDelete(`/accounting/invoices/customers/${c.id}`); showToast("Deleted", "success"); load(); } catch { showToast("Failed", "error"); } }} className="p-1.5 rounded-md hover:bg-red-50 cursor-pointer"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            <div className="text-center py-12 text-muted-foreground">Use the + button to record invoice payments.</div>
          )}
      </div>

      <Dialog open={showCustomerForm} onClose={() => setShowCustomerForm(false)} title="Add Customer" description="Create a new customer">
        <form onSubmit={handleCustomerSubmit} className="space-y-3">
          <FormField label="Name" required><Input value={customerForm.name} onChange={e => setCustomerForm({ ...customerForm, name: e.target.value })} placeholder="Customer name" /></FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Phone"><Input value={customerForm.phone} onChange={e => setCustomerForm({ ...customerForm, phone: e.target.value })} placeholder="Phone" /></FormField>
            <FormField label="Email"><Input value={customerForm.email} onChange={e => setCustomerForm({ ...customerForm, email: e.target.value })} placeholder="Email" /></FormField>
          </div>
          <FormField label="Address"><Input value={customerForm.address} onChange={e => setCustomerForm({ ...customerForm, address: e.target.value })} placeholder="Address" /></FormField>
          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => setShowCustomerForm(false)} className="cursor-pointer">Cancel</Button>
            <Button type="submit" disabled={saving} className="cursor-pointer">{saving ? "Saving..." : "Create"}</Button>
          </div>
        </form>
      </Dialog>

      <Dialog open={showInvoiceForm} onClose={() => setShowInvoiceForm(false)} title="New Invoice" description="Create a customer invoice">
        <form onSubmit={handleInvoiceSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Customer" required>
              <Select value={invoiceForm.customerId} onChange={val => setInvoiceForm({ ...invoiceForm, customerId: val})} options={[{ label: "Select customer", value: "" }, ...customers.map(c => ({ label: c.name, value: String(c.id) }))]} />
            </FormField>
            <FormField label="Invoice Date"><Input type="date" value={invoiceForm.invoiceDate} onChange={e => setInvoiceForm({ ...invoiceForm, invoiceDate: e.target.value })} /></FormField>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Items</p>
            {invoiceForm.items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-4">
                  <Select value={item.variantId} onChange={val => updateItem(idx, "variantId", val)} options={[{ label: "Select variant", value: "" }, ...variants.map(v => ({ label: `${v.sku} (${v.size}/${v.color})`, value: String(v.id) }))]} />
                </div>
                <div className="col-span-3"><Input value={item.description} onChange={e => updateItem(idx, "description", e.target.value)} placeholder="Description" /></div>
                <div className="col-span-2"><Input type="number" value={item.quantity} onChange={e => updateItem(idx, "quantity", e.target.value)} placeholder="Qty" min="0.01" step="any" /></div>
                <div className="col-span-2"><Input type="number" value={item.unitPrice} onChange={e => updateItem(idx, "unitPrice", e.target.value)} placeholder="Price" min="0" step="any" /></div>
                <div className="col-span-1">{idx > 0 && <button type="button" onClick={() => setInvoiceForm({ ...invoiceForm, items: invoiceForm.items.filter((_, i) => i !== idx) })} className="cursor-pointer"><X className="w-4 h-4 text-red-500" /></button>}</div>
              </div>
            ))}
            <button type="button" onClick={() => setInvoiceForm({ ...invoiceForm, items: [...invoiceForm.items, { description: "", variantId: "", sku: "", quantity: "1", unitPrice: "", totalPrice: "" }] })} className="text-xs text-primary hover:underline cursor-pointer">+ Add Item</button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Discount (Rs)"><Input type="number" value={invoiceForm.discount} onChange={e => setInvoiceForm({ ...invoiceForm, discount: e.target.value })} min="0" step="any" /></FormField>
            <FormField label="Note"><Input value={invoiceForm.note} onChange={e => setInvoiceForm({ ...invoiceForm, note: e.target.value })} placeholder="Optional" /></FormField>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={invoiceForm.adjustStockOut} onChange={e => setInvoiceForm({ ...invoiceForm, adjustStockOut: e.target.checked })} className="rounded" />
            Adjust stock out for linked variants
          </label>
          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => setShowInvoiceForm(false)} className="cursor-pointer">Cancel</Button>
            <Button type="submit" disabled={saving} className="cursor-pointer">{saving ? "Saving..." : "Create Invoice"}</Button>
          </div>
        </form>
      </Dialog>

      <Dialog open={showPaymentForm} onClose={() => setShowPaymentForm(false)} title="Record Payment" description={selectedInvoice ? `Invoice ${selectedInvoice.invoiceNo}` : "Record invoice payment"}>
        <form onSubmit={handlePaymentSubmit} className="space-y-3">
          {!selectedInvoice && (
            <FormField label="Invoice" required>
              <Select value={paymentForm.invoiceId} onChange={val => setPaymentForm({ ...paymentForm, invoiceId: val})} options={[{ label: "Select invoice", value: "" }, ...invoices.filter(i => i.status !== "paid").map(i => ({ label: `${i.invoiceNo} - ${i.customer.name}`, value: String(i.id) }))]} />
            </FormField>
          )}
          <FormField label="Deposit to Account" required>
            <Select value={paymentForm.accountId} onChange={val => setPaymentForm({ ...paymentForm, accountId: val})} options={[{ label: "Select account", value: "" }, ...accounts.map(a => ({ label: a.name, value: String(a.id) }))]} />
          </FormField>
          <FormField label="Amount" required><Input type="number" value={paymentForm.amount} onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })} placeholder="0.00" min="0.01" step="0.01" /></FormField>
          <FormField label="Date"><Input type="date" value={paymentForm.paymentDate} onChange={e => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })} /></FormField>
          <FormField label="Note"><Input value={paymentForm.note} onChange={e => setPaymentForm({ ...paymentForm, note: e.target.value })} placeholder="Optional" /></FormField>
          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => { setShowPaymentForm(false); setSelectedInvoice(null); }} className="cursor-pointer">Cancel</Button>
            <Button type="submit" disabled={saving} className="cursor-pointer">{saving ? "Saving..." : "Record"}</Button>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Delete Invoice" message={`Delete invoice "${deleteTarget?.name}"? All items and payments will be deleted.`} loading={saving} />
    </DashboardLayout>
  );
}
