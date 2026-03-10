"use client";

import React, { useState, useEffect } from "react";
import { PageShell } from "@/components/page-shell";
import type { FilterField } from "@/components/filter-panel";
import { Dialog, FormField, ConfirmDialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SearchSelect } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";
import { showToast } from "@/components/ui/toast";
import { usePermissions } from "@/lib/permissions";
import { BarcodeDialog } from "@/components/barcode-dialog";
import { ArrowDownToLine, ArrowUpFromLine, Barcode } from "lucide-react";

const sizeOptions = [
  { label: "Unstitched", value: "Unstitched" },
  { label: "Free Size", value: "Free Size" },
  { label: "XS", value: "XS" },
  { label: "S", value: "S" },
  { label: "M", value: "M" },
  { label: "L", value: "L" },
  { label: "XL", value: "XL" },
  { label: "XXL", value: "XXL" },
  { label: "3XL", value: "3XL" },
  { label: "28", value: "28" },
  { label: "30", value: "30" },
  { label: "32", value: "32" },
  { label: "34", value: "34" },
  { label: "36", value: "36" },
  { label: "38", value: "38" },
  { label: "40", value: "40" },
  { label: "42", value: "42" },
  { label: "44", value: "44" },
  { label: "46", value: "46" },
];

const typeOptions = [
  { label: "Regular", value: "Regular" },
  { label: "Slim Fit", value: "Slim Fit" },
  { label: "Fitted", value: "Fitted" },
  { label: "Relaxed", value: "Relaxed" },
  { label: "Classic", value: "Classic" },
  { label: "Straight", value: "Straight" },
  { label: "A-Line", value: "A-Line" },
  { label: "Flared", value: "Flared" },
  { label: "Stitched", value: "Stitched" },
  { label: "Unstitched", value: "Unstitched" },
  { label: "Ready to Wear", value: "Ready to Wear" },
  { label: "Semi-Stitched", value: "Semi-Stitched" },
];

const columns = [
  {
    label: "SKU",
    key: "sku",
    render: (value: unknown) => (
      <span className="font-mono text-xs font-medium">{String(value)}</span>
    ),
  },
  {
    label: "Barcode",
    key: "barcode",
    render: (value: unknown) => {
      const bc = String(value || "");
      return bc ? (
        <span className="font-mono text-xs">{bc}</span>
      ) : (
        <span className="text-xs text-muted-foreground">—</span>
      );
    },
  },
  { label: "Article", key: "articleName" },
  { label: "Collection", key: "collection" },
  { label: "Size", key: "size" },
  { label: "Type", key: "type" },
  { label: "Color", key: "color" },
  {
    label: "Qty",
    key: "quantity",
    render: (value: unknown) => {
      const num = Number(value);
      let cls = "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ";
      if (num === 0) cls += "bg-red-100 text-red-700";
      else if (num <= 5) cls += "bg-amber-100 text-amber-700";
      else if (num <= 20) cls += "bg-blue-100 text-blue-700";
      else cls += "bg-emerald-100 text-emerald-700";
      return <span className={cls}>{num}</span>;
    },
  },
  {
    label: "Status",
    key: "stockStatus",
    render: (value: unknown) => {
      const status = String(value);
      if (status === "Out of Stock") return <Badge variant="destructive">{status}</Badge>;
      if (status === "Low Stock") return <Badge variant="warning">{status}</Badge>;
      return <Badge variant="success">In Stock</Badge>;
    },
  },
];

const filterFields: FilterField[] = [
  {
    key: "size", label: "Size", type: "select",
    options: sizeOptions,
  },
  {
    key: "type", label: "Type", type: "select",
    options: typeOptions,
  },
  { key: "color", label: "Color", type: "text", placeholder: "Filter by color..." },
  { key: "dateFrom", label: "From Date", type: "date" },
  { key: "dateTo", label: "To Date", type: "date" },
];

function mapRow(item: Record<string, unknown>) {
  const article = item.article as Record<string, unknown> | undefined;
  const createdAt = item.createdAt as string | undefined;
  const qty = Number(item.quantity ?? 0);
  let stockStatus = "In Stock";
  if (qty === 0) stockStatus = "Out of Stock";
  else if (qty <= 5) stockStatus = "Low Stock";

  return {
    id: item.id,
    sku: item.sku,
    barcode: item.barcode || "",
    articleName: article?.name || "-",
    collection: article?.collection || "-",
    articleId: item.articleId,
    size: item.size,
    type: item.type,
    color: item.color,
    quantity: qty,
    stockStatus,
    created: createdAt ? new Date(createdAt).toLocaleDateString() : "-",
  };
}

export default function VariantsPage() {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Record<string, unknown> | null>(null);
  const [showStock, setShowStock] = useState<{ type: "in" | "out"; variant: Record<string, unknown> } | null>(null);
  const [barcodeVariant, setBarcodeVariant] = useState<Record<string, unknown> | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [saving, setSaving] = useState(false);
  const [articles, setArticles] = useState<Array<{ label: string; value: string }>>([]);
  const [purposes, setPurposes] = useState<Array<{label: string; value: string}>>([]);

  const { canPerformAction } = usePermissions();

  const [form, setForm] = useState({ sku: "", articleId: "", size: "", type: "", color: "", quantity: "", barcode: "" });
  const [stockForm, setStockForm] = useState({ qty: "", purpose: "", destination: "", reference: "", note: "" });

  const refresh = () => setRefreshTrigger((k) => k + 1);

  useEffect(() => {
    apiGet("/articles").then((res) => {
      const arts = (res.articles || []).map((a: Record<string, unknown>) => ({
        label: String(a.name),
        value: String(a.id),
      }));
      setArticles(arts);
    }).catch(() => {});
  }, [refreshTrigger]);

  useEffect(() => {
    apiGet("/purposes").then((data) => {
      if (data?.purposes) {
        setPurposes(data.purposes.map((p: Record<string, unknown>) => ({ label: String(p.name), value: String(p.name) })));
      }
    }).catch(() => {});
  }, []);

  const openCreate = () => {
    setForm({ sku: "", articleId: "", size: "", type: "Regular", color: "", quantity: "0", barcode: "" });
    setEditing(null);
    setShowForm(true);
  };

  const openEdit = (row: Record<string, unknown>) => {
    setForm({
      sku: String(row.sku || ""),
      articleId: String(row.articleId || ""),
      size: String(row.size || ""),
      type: String(row.type || ""),
      color: String(row.color || ""),
      quantity: String(row.quantity ?? 0),
      barcode: String(row.barcode || ""),
    });
    setEditing(row);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.size || !form.type || !form.color) {
      showToast("Please fill all required fields", "error");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await apiPut(`/variants/${editing.sku}`, {
          size: form.size,
          type: form.type,
          color: form.color,
          quantity: parseInt(form.quantity) || 0,
          barcode: form.barcode || undefined,
        });
        showToast("Variant updated successfully", "success");
      } else {
        if (!form.articleId) {
          showToast("Please select an article", "error");
          setSaving(false);
          return;
        }
        await apiPost("/variants", {
          sku: form.sku || undefined,
          articleId: parseInt(form.articleId),
          size: form.size,
          type: form.type,
          color: form.color,
          quantity: parseInt(form.quantity) || 0,
          barcode: form.barcode || undefined,
        });
        showToast("Variant created successfully", "success");
      }
      setShowForm(false);
      refresh();
    } catch (err: unknown) {
      showToast((err as Error).message || "Failed to save variant", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await apiDelete(`/variants/${deleteTarget.sku}`);
      showToast("Variant deleted successfully", "success");
      setDeleteTarget(null);
      refresh();
    } catch (err: unknown) {
      showToast((err as Error).message || "Failed to delete variant", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showStock || !stockForm.qty || !stockForm.purpose) {
      showToast("Please fill quantity and purpose", "error");
      return;
    }
    setSaving(true);
    try {
      const ep = showStock.type === "in" ? "/stock/in" : "/stock/out";
      await apiPost(ep, {
        sku: showStock.variant.sku,
        qty: parseInt(stockForm.qty),
        purpose: stockForm.purpose,
        destination: stockForm.destination || undefined,
        reference: stockForm.reference || undefined,
        note: stockForm.note || undefined,
      });
      showToast(`Stock ${showStock.type === "in" ? "in" : "out"} recorded successfully`, "success");
      setShowStock(null);
      setStockForm({ qty: "", purpose: "", destination: "", reference: "", note: "" });
      refresh();
    } catch (err: unknown) {
      showToast((err as Error).message || "Failed to update stock", "error");
    } finally {
      setSaving(false);
    }
  };

  const extraActions = (row: Record<string, unknown>) => (
    <>
      <button
        onClick={() => setBarcodeVariant(row)}
        className="p-1.5 rounded-md hover:bg-violet-50 dark:hover:bg-violet-950 transition-colors cursor-pointer" title="View Barcode"
      >
        <Barcode className="w-4 h-4 text-violet-600" />
      </button>
      {canPerformAction("stock_in") && (
        <button
          onClick={() => { setStockForm({ qty: "", purpose: "", destination: "", reference: "", note: "" }); setShowStock({ type: "in", variant: row }); }}
          className="p-1.5 rounded-md hover:bg-emerald-50 transition-colors cursor-pointer" title="Stock In"
        >
          <ArrowDownToLine className="w-4 h-4 text-emerald-600" />
        </button>
      )}
      {canPerformAction("stock_out") && (
        <button
          onClick={() => { setStockForm({ qty: "", purpose: "", destination: "", reference: "", note: "" }); setShowStock({ type: "out", variant: row }); }}
          className="p-1.5 rounded-md hover:bg-amber-50 transition-colors cursor-pointer" title="Stock Out"
        >
          <ArrowUpFromLine className="w-4 h-4 text-amber-600" />
        </button>
      )}
    </>
  );

  return (
    <>
      <PageShell
        title="Variants"
        description="Manage product variants — sizes, colors, fits, and stock levels."
        columns={columns}
        endpoint="/variants"
        dataKey="variants"
        searchPlaceholder="Search by SKU, barcode, or article name..."
        filterFields={filterFields}
        mapRow={mapRow}
        onAdd={canPerformAction("create") ? openCreate : undefined}
        onEdit={canPerformAction("edit") ? openEdit : undefined}
        onDelete={canPerformAction("delete") ? (row) => setDeleteTarget(row) : undefined}
        addLabel="Add Variant"
        extraActions={extraActions}
        refreshTrigger={refreshTrigger}
      />

      <Dialog
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? "Edit Variant" : "New Variant"}
        description={editing ? "Update variant details." : "Add a new product variant."}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {!editing && (
            <>
              <FormField label="Article" required>
                <SearchSelect
                  options={articles}
                  placeholder="Select article"
                  value={form.articleId}
                  onChange={(val) => setForm({ ...form, articleId: val })}
                />
              </FormField>
              <FormField label="SKU">
                <Input
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  placeholder="Leave empty for auto-generation"
                />
              </FormField>
            </>
          )}
          <FormField label="Barcode">
            <Input
              value={form.barcode}
              onChange={(e) => setForm({ ...form, barcode: e.target.value })}
              placeholder="Leave empty or enter custom barcode"
            />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Size" required>
              <SearchSelect
                options={sizeOptions}
                placeholder="Select size"
                value={form.size}
                onChange={(val) => setForm({ ...form, size: val })}
              />
            </FormField>
            <FormField label="Type / Fit" required>
              <SearchSelect
                options={typeOptions}
                placeholder="Select type"
                value={form.type}
                onChange={(val) => setForm({ ...form, type: val })}
              />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Color" required>
              <Input
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                placeholder="e.g. Navy, Black, Maroon"
              />
            </FormField>
            <FormField label="Initial Quantity">
              <Input
                type="number"
                min="0"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              />
            </FormField>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="cursor-pointer">Cancel</Button>
            <Button type="submit" disabled={saving} className="cursor-pointer">
              {saving ? "Saving..." : editing ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={!!showStock}
        onClose={() => setShowStock(null)}
        title={showStock?.type === "in" ? "Stock In" : "Stock Out"}
        description={`${showStock?.type === "in" ? "Receive" : "Issue"} stock for: ${showStock?.variant?.sku || ""}`}
      >
        <form onSubmit={handleStock} className="space-y-4">
          {showStock && (
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border">
              <div>
                <p className="text-sm font-medium">{String(showStock.variant.articleName || showStock.variant.sku)}</p>
                <p className="text-xs text-muted-foreground">{String(showStock.variant.size)} / {String(showStock.variant.color)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Current Stock</p>
                <p className="text-lg font-bold">{String(showStock.variant.quantity ?? 0)}</p>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Quantity" required>
              <Input type="number" min="1" step="1" value={stockForm.qty} onChange={(e) => setStockForm({ ...stockForm, qty: e.target.value })} placeholder="Enter qty" />
            </FormField>
            <FormField label="Purpose" required>
              <SearchSelect options={purposes} placeholder="Select purpose" value={stockForm.purpose} onChange={(val) => setStockForm({ ...stockForm, purpose: val })} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Destination">
              <Input value={stockForm.destination} onChange={(e) => setStockForm({ ...stockForm, destination: e.target.value })} placeholder="e.g. Warehouse A" />
            </FormField>
            <FormField label="Reference">
              <Input value={stockForm.reference} onChange={(e) => setStockForm({ ...stockForm, reference: e.target.value })} placeholder="e.g. Invoice #123" />
            </FormField>
          </div>
          <FormField label="Note">
            <Input value={stockForm.note} onChange={(e) => setStockForm({ ...stockForm, note: e.target.value })} placeholder="Optional note..." />
          </FormField>
          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => setShowStock(null)} className="cursor-pointer">Cancel</Button>
            <Button type="submit" disabled={saving} className={`cursor-pointer ${showStock?.type === "out" ? "bg-amber-600 hover:bg-amber-700" : ""}`}>
              {saving ? "Processing..." : showStock?.type === "in" ? "Stock In" : "Stock Out"}
            </Button>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Variant"
        message={`Are you sure you want to delete variant "${deleteTarget?.sku}"?`}
        loading={saving}
      />

      <BarcodeDialog
        open={!!barcodeVariant}
        onClose={() => setBarcodeVariant(null)}
        variant={barcodeVariant ? {
          sku: String(barcodeVariant.sku || ""),
          barcode: String(barcodeVariant.barcode || "") || undefined,
          articleName: String(barcodeVariant.articleName || ""),
          color: String(barcodeVariant.color || ""),
          size: String(barcodeVariant.size || ""),
        } : null}
        onBarcodeGenerated={refresh}
      />
    </>
  );
}
