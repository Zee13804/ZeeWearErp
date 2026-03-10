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
  { label: "Type", key: "type" },
  { label: "Color", key: "color" },
  { label: "Season", key: "season" },
  { label: "Stock (m)", key: "meters" },
  { label: "Created", key: "created" },
];

const filterFields: FilterField[] = [
  { key: "type", label: "Type", type: "text", placeholder: "Filter by type..." },
  { key: "color", label: "Color", type: "text", placeholder: "Filter by color..." },
  {
    key: "season", label: "Season", type: "select",
    options: [
      { label: "Spring/Summer", value: "SS" }, { label: "Fall/Winter", value: "FW" },
      { label: "Resort", value: "Resort" }, { label: "Pre-Fall", value: "Pre-Fall" },
    ],
  },
  { key: "dateFrom", label: "From Date", type: "date" },
  { key: "dateTo", label: "To Date", type: "date" },
];

const seasonOptions = [
  { label: "Spring/Summer", value: "SS" }, { label: "Fall/Winter", value: "FW" },
  { label: "Resort", value: "Resort" }, { label: "Pre-Fall", value: "Pre-Fall" },
];

function mapRow(item: Record<string, unknown>) {
  const createdAt = item.createdAt as string | undefined;
  return {
    id: item.id,
    imageUrl: item.imageUrl || null,
    name: item.name,
    type: item.type,
    color: item.color,
    season: item.season || "-",
    meters: typeof item.meters === "number" ? item.meters.toFixed(1) : "0.0",
    created: createdAt ? new Date(createdAt).toLocaleDateString() : "-",
  };
}

export default function FabricPage() {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Record<string, unknown> | null>(null);
  const [showStock, setShowStock] = useState<{ type: "in" | "out"; fabric: Record<string, unknown> } | null>(null);
  const [showImageUpload, setShowImageUpload] = useState<Record<string, unknown> | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [purposes, setPurposes] = useState<Array<{label: string; value: string}>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { canPerformAction } = usePermissions();

  const [form, setForm] = useState({ name: "", type: "", color: "", season: "", meters: "0" });
  const [stockForm, setStockForm] = useState({ meters: "", purpose: "", note: "" });

  const refresh = () => setRefreshTrigger((k) => k + 1);

  useEffect(() => {
    apiGet("/purposes").then((data) => {
      if (data?.purposes) {
        setPurposes(data.purposes.map((p: any) => ({ label: p.name, value: p.name })));
      }
    }).catch(() => {});
  }, []);

  const openCreate = () => {
    setForm({ name: "", type: "", color: "", season: "", meters: "0" });
    setEditing(null);
    setShowForm(true);
  };

  const openEdit = (row: Record<string, unknown>) => {
    setForm({
      name: String(row.name || ""),
      type: String(row.type || ""),
      color: String(row.color || ""),
      season: String(row.season || ""),
      meters: String(row.meters ?? 0),
    });
    setEditing(row);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.type || !form.color) {
      showToast("Please fill all required fields", "error");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await apiPut(`/fabric/${editing.id}`, {
          name: form.name,
          type: form.type,
          color: form.color,
          season: form.season || "",
        });
        showToast("Fabric updated successfully", "success");
      } else {
        await apiPost("/fabric", {
          name: form.name,
          type: form.type,
          color: form.color,
          season: form.season || undefined,
          meters: parseFloat(form.meters) || 0,
        });
        showToast("Fabric created successfully", "success");
      }
      setShowForm(false);
      refresh();
    } catch (err: unknown) {
      showToast((err as Error).message || "Failed to save fabric", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await apiDelete(`/fabric/${deleteTarget.id}`);
      showToast("Fabric deleted successfully", "success");
      setDeleteTarget(null);
      refresh();
    } catch (err: unknown) {
      showToast((err as Error).message || "Failed to delete fabric", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showStock || !stockForm.meters || !stockForm.purpose) {
      showToast("Please fill all fields", "error");
      return;
    }
    setSaving(true);
    try {
      const ep = showStock.type === "in" ? "/fabric/in" : "/fabric/out";
      await apiPost(ep, {
        fabricId: showStock.fabric.id,
        meters: parseFloat(stockForm.meters),
        purpose: stockForm.purpose,
        ...(stockForm.note.trim() && { note: stockForm.note.trim() }),
      });
      showToast(`Fabric ${showStock.type === "in" ? "received" : "issued"} successfully`, "success");
      setShowStock(null);
      setStockForm({ meters: "", purpose: "", note: "" });
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
      await apiUploadFile(`/fabric/${showImageUpload.id}/image`, file);
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
      await apiDelete(`/fabric/${showImageUpload.id}/image`);
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
          onClick={() => { setStockForm({ meters: "", purpose: "", note: "" }); setShowStock({ type: "in", fabric: row }); }}
          className="p-1.5 rounded-md hover:bg-emerald-50 transition-colors cursor-pointer" title="Stock In"
        >
          <ArrowDownToLine className="w-4 h-4 text-emerald-600" />
        </button>
      )}
      {canPerformAction("stock_out") && (
        <button
          onClick={() => { setStockForm({ meters: "", purpose: "", note: "" }); setShowStock({ type: "out", fabric: row }); }}
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
        title="Fabric"
        description="Manage fabric types, compositions, and suppliers."
        columns={columns}
        endpoint="/fabric"
        dataKey="fabrics"
        searchPlaceholder="Search fabric by name..."
        filterFields={filterFields}
        mapRow={mapRow}
        onAdd={canPerformAction("create") ? openCreate : undefined}
        onEdit={canPerformAction("edit") ? openEdit : undefined}
        onDelete={canPerformAction("delete") ? (row) => setDeleteTarget(row) : undefined}
        addLabel="Add Fabric"
        extraActions={extraActions}
        refreshTrigger={refreshTrigger}
      />

      <Dialog
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? "Edit Fabric" : "New Fabric"}
        description={editing ? "Update fabric details." : "Add a new fabric to inventory."}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Name" required>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Premium Cotton" />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Type" required>
              <Input value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} placeholder="e.g. Woven, Knit" />
            </FormField>
            <FormField label="Color" required>
              <Input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} placeholder="e.g. White, Navy" />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Season">
              <Select options={seasonOptions} placeholder="Select season" value={form.season} onChange={(val) => setForm({ ...form, season: val })} />
            </FormField>
            {!editing && (
              <FormField label="Initial Stock (m)">
                <Input type="number" min="0" step="0.1" value={form.meters} onChange={(e) => setForm({ ...form, meters: e.target.value })} />
              </FormField>
            )}
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="cursor-pointer">Cancel</Button>
            <Button type="submit" disabled={saving} className="cursor-pointer">{saving ? "Saving..." : editing ? "Update" : "Create"}</Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={!!showImageUpload}
        onClose={() => setShowImageUpload(null)}
        title="Fabric Image"
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
        title={showStock?.type === "in" ? "Fabric Stock In" : "Fabric Stock Out"}
        description={`${showStock?.type === "in" ? "Receive" : "Issue"} fabric: ${showStock?.fabric?.name || ""}`}
      >
        <form onSubmit={handleStock} className="space-y-4">
          <FormField label="Meters" required>
            <Input type="number" min="0.1" step="0.1" value={stockForm.meters} onChange={(e) => setStockForm({ ...stockForm, meters: e.target.value })} placeholder="Enter meters" />
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
        title="Delete Fabric"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        loading={saving}
      />
    </>
  );
}
