"use client";

import React, { useState, useRef, useEffect } from "react";
import { PageShell } from "@/components/page-shell";
import type { FilterField } from "@/components/filter-panel";
import { Dialog, FormField, ConfirmDialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { apiGet, apiPost, apiPut, apiDelete, apiUploadFile } from "@/lib/api";
import { showToast } from "@/components/ui/toast";
import { usePermissions } from "@/lib/permissions";
import { ArrowDownToLine, ArrowUpFromLine, Camera, X, Loader2, Image as ImageIcon } from "lucide-react";

const columns = [
  {
    label: "Image", key: "imageUrl", hideOnMobile: true,
    render: (value: unknown) => {
      const url = value as string | null;
      return url ? (
        <img src={url.startsWith("http") ? url : `/api${url}`} alt="" className="w-10 h-10 object-cover rounded-md" />
      ) : (
        <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
          <ImageIcon className="w-4 h-4 text-muted-foreground" />
        </div>
      );
    },
  },
  { label: "ID", key: "id" },
  { label: "Name", key: "name" },
  { label: "Category", key: "category" },
  { label: "Unit", key: "unit" },
  { label: "Qty", key: "quantity" },
  { label: "Created", key: "created" },
];

const baseFilterFields: FilterField[] = [
  {
    key: "unit", label: "Unit", type: "select",
    options: [
      { label: "Pieces", value: "Pieces" }, { label: "Meters", value: "Meters" },
      { label: "Spools", value: "Spools" }, { label: "Rolls", value: "Rolls" }, { label: "Kg", value: "Kg" },
    ],
  },
  { key: "dateFrom", label: "From Date", type: "date" },
  { key: "dateTo", label: "To Date", type: "date" },
];

const defaultCategories = [
  "Zippers", "Buttons", "Labels", "Threads", "Trims", "Tags", "Elastic",
];

const unitOptions = [
  { label: "Pieces", value: "Pieces" }, { label: "Meters", value: "Meters" },
  { label: "Spools", value: "Spools" }, { label: "Rolls", value: "Rolls" }, { label: "Kg", value: "Kg" },
];

function mapRow(item: Record<string, unknown>) {
  const createdAt = item.createdAt as string | undefined;
  return {
    id: item.id,
    imageUrl: item.imageUrl || null,
    name: item.name,
    category: item.category,
    unit: item.unit,
    quantity: item.quantity ?? 0,
    created: createdAt ? new Date(createdAt).toLocaleDateString() : "-",
  };
}

export default function AccessoriesPage() {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Record<string, unknown> | null>(null);
  const [showStock, setShowStock] = useState<{ type: "in" | "out"; acc: Record<string, unknown> } | null>(null);
  const [showImageUpload, setShowImageUpload] = useState<Record<string, unknown> | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [purposes, setPurposes] = useState<Array<{label: string; value: string}>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { canPerformAction } = usePermissions();

  const [form, setForm] = useState({ name: "", category: "", unit: "", quantity: "0" });
  const [stockForm, setStockForm] = useState({ quantity: "", purpose: "", note: "" });
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const allCategories = [...new Set([...defaultCategories, ...customCategories])].sort();
  const categoryOptions = [
    ...allCategories.map(c => ({ label: c, value: c })),
    { label: "+ New Category", value: "__new__" },
  ];

  const filterFields: FilterField[] = [
    {
      key: "category", label: "Category", type: "select",
      options: allCategories.map(c => ({ label: c, value: c })),
    },
    ...baseFilterFields,
  ];

  const refresh = () => setRefreshTrigger((k) => k + 1);

  useEffect(() => {
    apiGet("/purposes").then((data) => {
      if (data?.purposes) {
        setPurposes(data.purposes.map((p: any) => ({ label: p.name, value: p.name })));
      }
    }).catch(() => {});
    apiGet("/accessories?limit=1000").then((data) => {
      if (data?.accessories) {
        const cats = [...new Set(data.accessories.map((a: any) => a.category).filter(Boolean))] as string[];
        const extra = cats.filter(c => !defaultCategories.includes(c));
        if (extra.length > 0) setCustomCategories(prev => [...new Set([...prev, ...extra])]);
      }
    }).catch(() => {});
  }, []);

  const openCreate = () => {
    setForm({ name: "", category: "", unit: "", quantity: "0" });
    setEditing(null);
    setShowNewCategory(false);
    setNewCategoryName("");
    setShowForm(true);
  };

  const openEdit = (row: Record<string, unknown>) => {
    setForm({
      name: String(row.name || ""),
      category: String(row.category || ""),
      unit: String(row.unit || ""),
      quantity: String(row.quantity ?? 0),
    });
    setEditing(row);
    setShowNewCategory(false);
    setNewCategoryName("");
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.category || !form.unit) {
      showToast("Please fill all required fields", "error");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await apiPut(`/accessories/${editing.id}`, {
          name: form.name,
          category: form.category,
          unit: form.unit,
        });
        showToast("Accessory updated successfully", "success");
      } else {
        await apiPost("/accessories", {
          name: form.name,
          category: form.category,
          unit: form.unit,
          quantity: parseInt(form.quantity) || 0,
        });
        showToast("Accessory created successfully", "success");
      }
      setShowForm(false);
      refresh();
    } catch (err: unknown) {
      showToast((err as Error).message || "Failed to save accessory", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await apiDelete(`/accessories/${deleteTarget.id}`);
      showToast("Accessory deleted successfully", "success");
      setDeleteTarget(null);
      refresh();
    } catch (err: unknown) {
      showToast((err as Error).message || "Failed to delete accessory", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showStock || !stockForm.quantity || !stockForm.purpose) {
      showToast("Please fill all fields", "error");
      return;
    }
    setSaving(true);
    try {
      const ep = showStock.type === "in" ? "/accessories/in" : "/accessories/out";
      await apiPost(ep, {
        accessoryId: showStock.acc.id,
        quantity: parseInt(stockForm.quantity),
        purpose: stockForm.purpose,
        ...(stockForm.note.trim() && { note: stockForm.note.trim() }),
      });
      showToast(`Accessory ${showStock.type === "in" ? "received" : "issued"} successfully`, "success");
      setShowStock(null);
      setStockForm({ quantity: "", purpose: "", note: "" });
      refresh();
    } catch (err: unknown) {
      showToast((err as Error).message || "Failed to update stock", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !showImageUpload) return;
    setUploading(true);
    try {
      await apiUploadFile(`/accessories/${showImageUpload.id}/image`, file);
      showToast("Image uploaded successfully", "success");
      setShowImageUpload(null);
      refresh();
    } catch (err: unknown) {
      showToast((err as Error).message || "Failed to upload image", "error");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleImageDelete = async () => {
    if (!showImageUpload) return;
    setUploading(true);
    try {
      await apiDelete(`/accessories/${showImageUpload.id}/image`);
      showToast("Image removed successfully", "success");
      setShowImageUpload(null);
      refresh();
    } catch (err: unknown) {
      showToast((err as Error).message || "Failed to remove image", "error");
    } finally {
      setUploading(false);
    }
  };

  const extraActions = (row: Record<string, unknown>) => (
    <>
      {canPerformAction("edit") && (
        <button
          onClick={() => setShowImageUpload(row)}
          className="p-1.5 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors cursor-pointer" title="Upload Image"
        >
          <Camera className="w-4 h-4 text-blue-600" />
        </button>
      )}
      {canPerformAction("stock_in") && (
        <button
          onClick={() => { setStockForm({ quantity: "", purpose: "", note: "" }); setShowStock({ type: "in", acc: row }); }}
          className="p-1.5 rounded-md hover:bg-emerald-50 transition-colors cursor-pointer" title="Stock In"
        >
          <ArrowDownToLine className="w-4 h-4 text-emerald-600" />
        </button>
      )}
      {canPerformAction("stock_out") && (
        <button
          onClick={() => { setStockForm({ quantity: "", purpose: "", note: "" }); setShowStock({ type: "out", acc: row }); }}
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
        title="Accessories"
        description="Manage buttons, zippers, labels, and other accessories."
        columns={columns}
        endpoint="/accessories"
        dataKey="accessories"
        searchPlaceholder="Search accessories by name..."
        filterFields={filterFields}
        mapRow={mapRow}
        onAdd={canPerformAction("create") ? openCreate : undefined}
        onEdit={canPerformAction("edit") ? openEdit : undefined}
        onDelete={canPerformAction("delete") ? (row) => setDeleteTarget(row) : undefined}
        addLabel="Add Accessory"
        extraActions={extraActions}
        refreshTrigger={refreshTrigger}
      />

      <Dialog
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? "Edit Accessory" : "New Accessory"}
        description={editing ? "Update accessory details." : "Add a new accessory to inventory."}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Name" required>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Metal Zipper #5" />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Category" required>
              {showNewCategory ? (
                <div className="flex gap-2">
                  <Input
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Type new category name"
                    autoFocus
                  />
                  <Button
                    type="button"
                    size="sm"
                    className="cursor-pointer shrink-0"
                    onClick={() => {
                      if (newCategoryName.trim()) {
                        const cat = newCategoryName.trim();
                        setCustomCategories(prev => [...new Set([...prev, cat])]);
                        setForm({ ...form, category: cat });
                        setNewCategoryName("");
                        setShowNewCategory(false);
                      }
                    }}
                  >
                    Add
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="cursor-pointer shrink-0"
                    onClick={() => { setShowNewCategory(false); setNewCategoryName(""); }}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Select
                  options={categoryOptions}
                  placeholder="Select category"
                  value={form.category}
                  onChange={(val) => {
                    if (val === "__new__") {
                      setShowNewCategory(true);
                    } else {
                      setForm({ ...form, category: val });
                    }
                  }}
                />
              )}
            </FormField>
            <FormField label="Unit" required>
              <Select options={unitOptions} placeholder="Select unit" value={form.unit} onChange={(val) => setForm({ ...form, unit: val })} />
            </FormField>
          </div>
          {!editing && (
            <FormField label="Initial Quantity">
              <Input type="number" min="0" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
            </FormField>
          )}
          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="cursor-pointer">Cancel</Button>
            <Button type="submit" disabled={saving} className="cursor-pointer">{saving ? "Saving..." : editing ? "Update" : "Create"}</Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={!!showImageUpload}
        onClose={() => setShowImageUpload(null)}
        title="Accessory Image"
        description={`Manage image for: ${showImageUpload?.name || ""}`}
      >
        <div className="space-y-4">
          {showImageUpload?.imageUrl ? (
            <div className="space-y-3">
              <div className="relative rounded-lg overflow-hidden border border-border">
                <img
                  src={String(showImageUpload.imageUrl).startsWith("http") ? String(showImageUpload.imageUrl) : `/api${showImageUpload.imageUrl}`}
                  alt={String(showImageUpload.name || "")}
                  className="w-full max-h-64 object-contain bg-muted"
                />
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Camera className="w-4 h-4 mr-2" />}
                  Replace Image
                </Button>
                <Button
                  variant="outline"
                  className="cursor-pointer text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  onClick={handleImageDelete}
                  disabled={uploading}
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <X className="w-4 h-4 mr-2" />}
                  Remove
                </Button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => !uploading && fileInputRef.current?.click()}
              className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-accent/30 transition-colors"
            >
              {uploading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Uploading & compressing...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Camera className="w-8 h-8 text-muted-foreground" />
                  <p className="text-sm font-medium">Click to upload image</p>
                  <p className="text-xs text-muted-foreground">JPG, PNG, WebP, GIF (auto-compressed to max 40KB)</p>
                </div>
              )}
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleImageUpload}
          />
        </div>
      </Dialog>

      <Dialog
        open={!!showStock}
        onClose={() => setShowStock(null)}
        title={showStock?.type === "in" ? "Accessory Stock In" : "Accessory Stock Out"}
        description={`${showStock?.type === "in" ? "Receive" : "Issue"}: ${showStock?.acc?.name || ""} (${showStock?.acc?.unit || ""})`}
      >
        <form onSubmit={handleStock} className="space-y-4">
          <FormField label="Quantity" required>
            <Input type="number" min="1" value={stockForm.quantity} onChange={(e) => setStockForm({ ...stockForm, quantity: e.target.value })} placeholder="Enter quantity" />
          </FormField>
          <FormField label="Purpose" required>
            <Select options={purposes} placeholder="Select purpose" value={stockForm.purpose} onChange={(val) => setStockForm({ ...stockForm, purpose: val })} />
          </FormField>
          <FormField label="Note">
            <Input value={stockForm.note} onChange={(e) => setStockForm({ ...stockForm, note: e.target.value })} placeholder="Optional note" />
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
        title="Delete Accessory"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        loading={saving}
      />
    </>
  );
}
