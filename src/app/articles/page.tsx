"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import type { FilterField } from "@/components/filter-panel";
import { Dialog, FormField, ConfirmDialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SearchSelect } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { apiPost, apiPut, apiDelete, apiGet } from "@/lib/api";
import { showToast } from "@/components/ui/toast";
import { usePermissions } from "@/lib/permissions";
import { Camera, Eye, X, Loader2, Image as ImageIcon } from "lucide-react";

const categoryOptions = [
  { label: "Shirt", value: "Shirt" },
  { label: "Kurta", value: "Kurta" },
  { label: "Suit", value: "Suit" },
  { label: "Pant / Trouser", value: "Pant" },
  { label: "Shalwar Kameez", value: "Shalwar Kameez" },
  { label: "Jacket / Waistcoat", value: "Jacket" },
  { label: "Dupatta / Shawl", value: "Dupatta" },
  { label: "Abaya / Kaftan", value: "Abaya" },
  { label: "Unstitched Fabric", value: "Unstitched" },
  { label: "Accessories", value: "Accessories" },
  { label: "General", value: "General" },
];

const seasonOptions = [
  { label: "Spring/Summer", value: "SS" },
  { label: "Fall/Winter", value: "FW" },
  { label: "Resort", value: "Resort" },
  { label: "Pre-Fall", value: "Pre-Fall" },
  { label: "All Season", value: "All Season" },
  { label: "Eid Collection", value: "Eid" },
  { label: "Wedding", value: "Wedding" },
  { label: "Casual", value: "Casual" },
];

const columns = [
  {
    label: "Name",
    key: "name",
    render: (value: unknown, row: Record<string, unknown>) => (
      <Link href={`/articles/${row.id}`} className="font-medium text-foreground hover:text-blue-600 hover:underline transition-colors">
        {String(value)}
      </Link>
    ),
  },
  { label: "Category", key: "category" },
  { label: "Collection", key: "collection" },
  { label: "Fabric", key: "fabric" },
  { label: "Season", key: "season" },
  {
    label: "Variants",
    key: "variantCount",
    render: (value: unknown) => (
      <span className="font-medium">{String(value)}</span>
    ),
  },
  {
    label: "Total Pcs",
    key: "totalPcs",
    render: (value: unknown) => {
      const num = Number(value);
      let cls = "font-semibold";
      if (num === 0) cls += " text-red-600";
      else if (num <= 10) cls += " text-amber-600";
      else cls += " text-emerald-600";
      return <span className={cls}>{num.toLocaleString()}</span>;
    },
  },
  { label: "Created", key: "created" },
];

function mapRow(item: Record<string, unknown>) {
  const variants = item.variants as Array<Record<string, unknown>> | undefined;
  const createdAt = item.createdAt as string | undefined;
  const totalPcs = variants
    ? variants.reduce((sum, v) => sum + (typeof v.quantity === "number" ? v.quantity : 0), 0)
    : 0;
  return {
    id: item.id,
    name: item.name,
    category: item.category || "General",
    collection: item.collection,
    fabric: item.fabric,
    season: item.season || "-",
    variantCount: variants ? variants.length : 0,
    totalPcs: totalPcs,
    created: createdAt ? new Date(createdAt).toLocaleDateString() : "-",
  };
}

export default function ArticlesPage() {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Record<string, unknown> | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [saving, setSaving] = useState(false);
  const [imageArticle, setImageArticle] = useState<Record<string, unknown> | null>(null);
  const [images, setImages] = useState<Array<{ id: number; url: string; alt: string }>>([]);
  const [uploading, setUploading] = useState(false);
  const [deletingImageId, setDeletingImageId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [filterOpts, setFilterOpts] = useState<{collections: string[]; fabrics: string[]; seasons: string[]; categories: string[]} | null>(null);
  const [showPricing, setShowPricing] = useState(false);
  const { canPerformAction } = usePermissions();

  const [form, setForm] = useState({
    name: "", collection: "", fabric: "", season: "", category: "General",
    description: "", costPrice: "", sellingPrice: "",
  });

  useEffect(() => {
    apiGet("/articles/filter-options").then(setFilterOpts).catch(() => {});
  }, [refreshTrigger]);

  const filterFields: FilterField[] = [
    {
      key: "category", label: "Category", type: "select",
      options: filterOpts?.categories?.length
        ? filterOpts.categories.map(c => ({ label: c, value: c }))
        : categoryOptions,
    },
    {
      key: "collection", label: "Collection", type: "select",
      options: (filterOpts?.collections || []).map(c => ({ label: c, value: c })),
    },
    {
      key: "fabric", label: "Fabric", type: "select",
      options: (filterOpts?.fabrics || []).map(f => ({ label: f, value: f })),
    },
    {
      key: "season", label: "Season", type: "select",
      options: filterOpts?.seasons?.length
        ? filterOpts.seasons.map(s => ({ label: s, value: s }))
        : seasonOptions,
    },
    { key: "dateFrom", label: "From Date", type: "date" },
    { key: "dateTo", label: "To Date", type: "date" },
  ];

  const refresh = () => setRefreshTrigger((k) => k + 1);

  const openImages = async (row: Record<string, unknown>) => {
    setImageArticle(row);
    try {
      const res = await apiGet(`/images?articleId=${row.id}`);
      setImages(res.images || []);
    } catch {
      setImages([]);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !imageArticle) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("articleId", String(imageArticle.id));
      const token = localStorage.getItem("token");
      const res = await fetch("/api/images", {
        method: "POST",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      showToast("Image uploaded successfully", "success");
      const imgRes = await apiGet(`/images?articleId=${imageArticle.id}`);
      setImages(imgRes.images || []);
    } catch {
      showToast("Failed to upload image", "error");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteImage = async (imageId: number) => {
    setDeletingImageId(imageId);
    try {
      await apiDelete(`/images/${imageId}`);
      setImages((prev) => prev.filter((img) => img.id !== imageId));
      showToast("Image deleted", "success");
    } catch {
      showToast("Failed to delete image", "error");
    } finally {
      setDeletingImageId(null);
    }
  };

  const extraActions = (row: Record<string, unknown>) => (
    <div className="flex items-center gap-1">
      <button onClick={() => router.push(`/articles/${row.id}`)} className="p-1.5 rounded-md hover:bg-blue-50 transition-colors cursor-pointer" title="View Details">
        <Eye className="w-4 h-4 text-blue-600" />
      </button>
      <button onClick={() => openImages(row)} className="p-1.5 rounded-md hover:bg-violet-50 transition-colors cursor-pointer" title="Manage Images">
        <Camera className="w-4 h-4 text-violet-600" />
      </button>
    </div>
  );

  const openCreate = () => {
    setForm({ name: "", collection: "", fabric: "", season: "", category: "General", description: "", costPrice: "", sellingPrice: "" });
    setShowPricing(false);
    setEditing(null);
    setShowForm(true);
  };

  const openEdit = (row: Record<string, unknown>) => {
    setForm({
      name: String(row.name || ""),
      collection: String(row.collection || ""),
      fabric: String(row.fabric || ""),
      season: String(row.season || ""),
      category: String(row.category || "General"),
      description: String(row.description || ""),
      costPrice: row.costPrice ? String(row.costPrice) : "",
      sellingPrice: row.sellingPrice ? String(row.sellingPrice) : "",
    });
    setShowPricing(!!(row.costPrice || row.sellingPrice));
    setEditing(row);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.collection || !form.fabric || !form.season) {
      showToast("Please fill all required fields", "error");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        collection: form.collection,
        fabric: form.fabric,
        season: form.season,
        category: form.category || "General",
        description: form.description || "",
        costPrice: form.costPrice ? parseFloat(form.costPrice) : null,
        sellingPrice: form.sellingPrice ? parseFloat(form.sellingPrice) : null,
      };
      if (editing) {
        await apiPut(`/articles/${editing.id}`, payload);
        showToast("Article updated successfully", "success");
      } else {
        await apiPost("/articles", payload);
        showToast("Article created successfully", "success");
      }
      setShowForm(false);
      refresh();
    } catch (err: unknown) {
      showToast((err as Error).message || "Failed to save article", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await apiDelete(`/articles/${deleteTarget.id}`);
      showToast("Article deleted successfully", "success");
      setDeleteTarget(null);
      refresh();
    } catch (err: unknown) {
      showToast((err as Error).message || "Failed to delete article", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageShell
        title="Articles"
        description="Manage your product articles and catalog."
        columns={columns}
        endpoint="/articles"
        dataKey="articles"
        searchPlaceholder="Search articles by name..."
        filterFields={filterFields}
        mapRow={mapRow}
        onAdd={canPerformAction("create") ? openCreate : undefined}
        onEdit={canPerformAction("edit") ? openEdit : undefined}
        onDelete={canPerformAction("delete") ? (row) => setDeleteTarget(row) : undefined}
        addLabel="Add Article"
        refreshTrigger={refreshTrigger}
        extraActions={extraActions}
      />

      <Dialog
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? "Edit Article" : "New Article"}
        description={editing ? "Update article details." : "Add a new article to the catalog."}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Article Name" required>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Lawn Printed 3pc Suit"
            />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Category" required>
              <SearchSelect
                options={categoryOptions}
                placeholder="Select category"
                value={form.category}
                onChange={(val) => setForm({ ...form, category: val })}
              />
            </FormField>
            <FormField label="Season" required>
              <SearchSelect
                options={seasonOptions}
                placeholder="Select season"
                value={form.season}
                onChange={(val) => setForm({ ...form, season: val })}
              />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Collection" required>
              <Input
                value={form.collection}
                onChange={(e) => setForm({ ...form, collection: e.target.value })}
                placeholder="e.g. Summer 2026"
              />
            </FormField>
            <FormField label="Fabric" required>
              <Input
                value={form.fabric}
                onChange={(e) => setForm({ ...form, fabric: e.target.value })}
                placeholder="e.g. Lawn, Cotton, Silk"
              />
            </FormField>
          </div>
          <FormField label="Description">
            <Input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Brief description (optional)"
            />
          </FormField>
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex items-center gap-1"
            onClick={() => setShowPricing(!showPricing)}
          >
            {showPricing ? "▾ Hide Pricing" : "▸ Show Pricing (optional)"}
          </button>
          {showPricing && (
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Cost Price">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.costPrice}
                  onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
                  placeholder="0.00"
                />
              </FormField>
              <FormField label="Selling Price">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.sellingPrice}
                  onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })}
                  placeholder="0.00"
                />
              </FormField>
            </div>
          )}
          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="cursor-pointer">
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="cursor-pointer">
              {saving ? "Saving..." : editing ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Article"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        loading={saving}
      />

      <Dialog
        open={!!imageArticle}
        onClose={() => { setImageArticle(null); setImages([]); }}
        title={`Image — ${imageArticle?.name || ""}`}
        description="Upload or replace article image (max 1 image, auto-compressed to 40KB)."
      >
        <div className="space-y-4">
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleUpload} />

          {images.length === 0 ? (
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
                  <ImageIcon className="w-10 h-10 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">Click to upload image</p>
                  <p className="text-xs text-muted-foreground">JPG, PNG, WebP, GIF</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-lg overflow-hidden border border-border">
                <img src={`/api${images[0].url}`} alt={images[0].alt || "Article image"} className="w-full max-h-64 object-contain bg-muted" />
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-2 cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                  Replace Image
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 cursor-pointer text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  onClick={() => handleDeleteImage(images[0].id)}
                  disabled={deletingImageId === images[0].id}
                >
                  {deletingImageId === images[0].id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                  Remove
                </Button>
              </div>
            </div>
          )}
        </div>
      </Dialog>
    </>
  );
}
