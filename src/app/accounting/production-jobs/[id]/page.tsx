"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Dialog, FormField, ConfirmDialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { apiGet, apiPost, apiDelete } from "@/lib/api";
import { showToast } from "@/components/ui/toast";
import { isAdmin } from "@/lib/auth";
import {
  Plus, Trash2, Loader2, ArrowLeft, Package, Wrench, ShoppingCart, Calculator
} from "lucide-react";

interface WorkEntry {
  id: number;
  workType: string;
  vendorName: string;
  quantity: number;
  ratePerPiece: number;
  totalCost: number;
  workDate: string;
  notes?: string;
  account: { id: number; name: string };
}

interface SupplierPurchase {
  id: number;
  supplier: { name: string };
  invoiceNo?: string;
  description?: string;
  totalAmount: number;
  purchaseDate: string;
  items: Array<{ description: string; quantity: number; unit: string; unitPrice: number; totalPrice: number }>;
}

interface JobDetail {
  id: number;
  collection: string;
  description?: string;
  status: string;
  createdAt: string;
  workEntries: WorkEntry[];
  linkedPurchases: SupplierPurchase[];
  totalOutsourceCost: number;
  totalMaterialCost: number;
  grandTotal: number;
}

interface Account { id: number; name: string; }

const WORK_TYPES = [
  "Cutting", "Stitching", "Embroidery", "Aada Work",
  "Quality Check", "Packing", "Dupatta Work", "Shirt Work",
  "Trouser Stitching", "Custom"
];

function fmt(n: number) {
  return n.toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const canDelete = isAdmin();

  const [job, setJob] = useState<JobDetail | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [deleteEntry, setDeleteEntry] = useState<{ id: number; label: string } | null>(null);
  const [expandedPurchase, setExpandedPurchase] = useState<number | null>(null);

  const today = new Date().toISOString().split("T")[0];
  const [entryForm, setEntryForm] = useState({
    workType: "Cutting",
    vendorName: "",
    quantity: "",
    ratePerPiece: "",
    accountId: "",
    workDate: today,
    notes: "",
  });

  const load = async () => {
    setLoading(true);
    try {
      const [jRes, accRes] = await Promise.all([
        apiGet(`/accounting/production-jobs/${id}`),
        apiGet("/accounting/accounts"),
      ]);
      setJob(jRes.job);
      setAccounts(accRes.accounts || []);
    } catch {
      showToast("Failed to load job details", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const totalCost =
    (parseFloat(entryForm.quantity) || 0) * (parseFloat(entryForm.ratePerPiece) || 0);

  const handleAddEntry = async () => {
    if (!entryForm.vendorName.trim()) { showToast("Vendor name is required", "error"); return; }
    if (!entryForm.accountId) { showToast("Please select an account", "error"); return; }
    setSaving(true);
    try {
      await apiPost(`/accounting/production-jobs/${id}/entries`, {
        ...entryForm,
        totalCost,
      });
      showToast("Work entry added", "success");
      setShowEntryForm(false);
      setEntryForm({ workType: "Cutting", vendorName: "", quantity: "", ratePerPiece: "", accountId: "", workDate: today, notes: "" });
      load();
    } catch (e: any) {
      showToast(e.message || "Failed to add entry", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEntry = async () => {
    if (!deleteEntry) return;
    try {
      await apiDelete(`/accounting/production-jobs/entries/${deleteEntry.id}`);
      showToast("Work entry deleted", "success");
      setDeleteEntry(null);
      load();
    } catch (e: any) {
      showToast(e.message || "Failed to delete entry", "error");
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!job) {
    return (
      <DashboardLayout>
        <div className="text-center py-20 text-muted-foreground">Job not found</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-start gap-3">
          <button
            onClick={() => router.push("/accounting/production-jobs")}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">{job.collection}</h1>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                job.status === "active"
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                  : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
              }`}>
                {job.status}
              </span>
            </div>
            {job.description && <p className="text-muted-foreground mt-0.5 text-sm">{job.description}</p>}
          </div>
        </div>

        {/* Cost Sheet Summary */}
        <div className="bg-background rounded-xl border border-border p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Calculator className="w-4 h-4 text-primary" /> Cost Sheet
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 p-4">
              <p className="text-xs text-orange-700 dark:text-orange-400 font-medium">Outsource Work Cost</p>
              <p className="text-xl font-bold text-orange-700 dark:text-orange-400 mt-1">
                Rs {fmt(job.totalOutsourceCost)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{job.workEntries.length} work entries</p>
            </div>
            <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4">
              <p className="text-xs text-blue-700 dark:text-blue-400 font-medium">Material Purchases</p>
              <p className="text-xl font-bold text-blue-700 dark:text-blue-400 mt-1">
                Rs {fmt(job.totalMaterialCost)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{job.linkedPurchases.length} supplier purchases</p>
            </div>
            <div className="rounded-lg bg-foreground/5 border-2 border-primary/30 p-4">
              <p className="text-xs text-foreground font-medium">Grand Total</p>
              <p className="text-xl font-bold text-primary mt-1">Rs {fmt(job.grandTotal)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Total production cost</p>
            </div>
          </div>
        </div>

        {/* Outsource Work Entries */}
        <div className="bg-background rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Wrench className="w-4 h-4 text-orange-600" /> Outsource Work Entries
            </h2>
            <Button size="sm" onClick={() => setShowEntryForm(true)}>
              <Plus className="w-4 h-4 mr-1" /> Add Entry
            </Button>
          </div>

          {job.workEntries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Wrench className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No work entries yet. Add the first outsource work entry.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 text-xs text-muted-foreground font-medium">Work Type</th>
                    <th className="text-left py-2 px-3 text-xs text-muted-foreground font-medium">Vendor</th>
                    <th className="text-right py-2 px-3 text-xs text-muted-foreground font-medium">Qty</th>
                    <th className="text-right py-2 px-3 text-xs text-muted-foreground font-medium">Rate/pc</th>
                    <th className="text-right py-2 px-3 text-xs text-muted-foreground font-medium">Total</th>
                    <th className="text-left py-2 px-3 text-xs text-muted-foreground font-medium">Account</th>
                    <th className="text-left py-2 px-3 text-xs text-muted-foreground font-medium">Date</th>
                    {canDelete && <th className="py-2 px-3"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {job.workEntries.map(entry => (
                    <tr key={entry.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-md bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs font-medium">
                          {entry.workType}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-medium text-foreground">{entry.vendorName}</td>
                      <td className="py-2.5 px-3 text-right text-muted-foreground">{fmt(entry.quantity)}</td>
                      <td className="py-2.5 px-3 text-right text-muted-foreground">Rs {fmt(entry.ratePerPiece)}</td>
                      <td className="py-2.5 px-3 text-right font-semibold text-foreground">Rs {fmt(entry.totalCost)}</td>
                      <td className="py-2.5 px-3 text-muted-foreground text-xs">{entry.account.name}</td>
                      <td className="py-2.5 px-3 text-muted-foreground text-xs">
                        {new Date(entry.workDate).toLocaleDateString("en-PK")}
                      </td>
                      {canDelete && (
                        <td className="py-2.5 px-3">
                          <button
                            onClick={() => setDeleteEntry({ id: entry.id, label: `${entry.workType} by ${entry.vendorName}` })}
                            className="p-1 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/20">
                    <td colSpan={4} className="py-2.5 px-3 text-sm font-semibold text-foreground">Total Outsource Cost</td>
                    <td className="py-2.5 px-3 text-right font-bold text-orange-600">
                      Rs {fmt(job.totalOutsourceCost)}
                    </td>
                    <td colSpan={canDelete ? 3 : 2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* Linked Supplier Purchases */}
        <div className="bg-background rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-blue-600" /> Material Purchases for "{job.collection}"
            </h2>
            <a
              href="/accounting/suppliers"
              className="text-xs text-primary hover:underline"
            >
              Add purchase in Suppliers →
            </a>
          </div>

          {job.linkedPurchases.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No material purchases linked to this collection.</p>
              <p className="text-xs mt-1">When adding a supplier purchase, select "{job.collection}" as the collection.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {job.linkedPurchases.map(purchase => (
                <div key={purchase.id} className="border border-border rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedPurchase(expandedPurchase === purchase.id ? null : purchase.id)}
                    className="w-full flex items-center justify-between p-3 hover:bg-muted/30 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {purchase.supplier.name}
                          {purchase.invoiceNo && <span className="text-muted-foreground font-normal ml-1">#{purchase.invoiceNo}</span>}
                        </p>
                        {purchase.description && (
                          <p className="text-xs text-muted-foreground truncate">{purchase.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-semibold text-blue-600 text-sm">Rs {fmt(purchase.totalAmount)}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(purchase.purchaseDate).toLocaleDateString("en-PK")}
                      </span>
                    </div>
                  </button>
                  {expandedPurchase === purchase.id && purchase.items.length > 0 && (
                    <div className="border-t border-border bg-muted/20 p-3">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-muted-foreground">
                            <th className="text-left pb-1 font-medium">Item</th>
                            <th className="text-right pb-1 font-medium">Qty</th>
                            <th className="text-right pb-1 font-medium">Unit Price</th>
                            <th className="text-right pb-1 font-medium">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                          {purchase.items.map((item, i) => (
                            <tr key={i}>
                              <td className="py-1 text-foreground">{item.description}</td>
                              <td className="py-1 text-right text-muted-foreground">{item.quantity} {item.unit}</td>
                              <td className="py-1 text-right text-muted-foreground">Rs {fmt(item.unitPrice)}</td>
                              <td className="py-1 text-right font-medium text-foreground">Rs {fmt(item.totalPrice)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
              <div className="flex justify-end pt-2">
                <span className="text-sm font-semibold text-blue-600">
                  Total Materials: Rs {fmt(job.totalMaterialCost)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Work Entry Modal */}
      {showEntryForm && (
        <Dialog title="Add Outsource Work Entry" onClose={() => setShowEntryForm(false)}>
          <div className="space-y-4">
            <FormField label="Work Type *">
              <Select
                value={entryForm.workType}
                onChange={e => setEntryForm(f => ({ ...f, workType: e.target.value }))}
              >
                {WORK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </Select>
            </FormField>
            <FormField label="Vendor / Tailor Name *">
              <Input
                value={entryForm.vendorName}
                onChange={e => setEntryForm(f => ({ ...f, vendorName: e.target.value }))}
                placeholder="e.g. Ahmad Tailor, Raza Embroidery"
              />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Quantity (pieces)">
                <Input
                  type="number"
                  min="0"
                  value={entryForm.quantity}
                  onChange={e => setEntryForm(f => ({ ...f, quantity: e.target.value }))}
                  placeholder="0"
                />
              </FormField>
              <FormField label="Rate per Piece (Rs)">
                <Input
                  type="number"
                  min="0"
                  value={entryForm.ratePerPiece}
                  onChange={e => setEntryForm(f => ({ ...f, ratePerPiece: e.target.value }))}
                  placeholder="0"
                />
              </FormField>
            </div>
            {totalCost > 0 && (
              <div className="rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 p-3 text-center">
                <p className="text-xs text-orange-700 dark:text-orange-400">Total Cost</p>
                <p className="text-lg font-bold text-orange-700 dark:text-orange-400">Rs {fmt(totalCost)}</p>
              </div>
            )}
            <FormField label="Pay from Account *">
              <Select
                value={entryForm.accountId}
                onChange={e => setEntryForm(f => ({ ...f, accountId: e.target.value }))}
              >
                <option value="">Select account</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </Select>
            </FormField>
            <FormField label="Date">
              <Input
                type="date"
                value={entryForm.workDate}
                onChange={e => setEntryForm(f => ({ ...f, workDate: e.target.value }))}
              />
            </FormField>
            <FormField label="Notes">
              <Input
                value={entryForm.notes}
                onChange={e => setEntryForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Optional notes"
              />
            </FormField>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowEntryForm(false)}>Cancel</Button>
              <Button onClick={handleAddEntry} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Add Entry
              </Button>
            </div>
          </div>
        </Dialog>
      )}

      {deleteEntry && (
        <ConfirmDialog
          title="Delete Work Entry"
          message={`Delete "${deleteEntry.label}"? This will credit the account back.`}
          onConfirm={handleDeleteEntry}
          onCancel={() => setDeleteEntry(null)}
          confirmLabel="Delete"
          variant="danger"
        />
      )}
    </DashboardLayout>
  );
}
