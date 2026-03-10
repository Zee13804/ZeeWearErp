"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SearchSelect } from "@/components/ui/select";
import { Dialog, FormField, ConfirmDialog } from "@/components/ui/dialog";
import { showToast } from "@/components/ui/toast";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";
import { usePermissions } from "@/lib/permissions";
import { ArrowLeft, Upload, X, Loader2, Image as ImageIcon, Plus, ArrowDownToLine, ArrowUpFromLine, Trash2, History, Pencil } from "lucide-react";

interface Variant {
  id: number;
  sku: string;
  size: string;
  type: string;
  color: string;
  quantity: number;
}

interface Article {
  id: number;
  name: string;
  collection: string;
  fabric: string;
  season: string;
  category: string;
  description: string;
  costPrice: number | null;
  sellingPrice: number | null;
  createdAt: string;
  variants: Variant[];
}

interface ArticleImage {
  id: number;
  url: string;
  alt: string;
}

interface StockMovement {
  id: number;
  type: string;
  qty: number;
  purpose: string;
  destination: string | null;
  reference: string | null;
  createdAt: string;
}

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

const sizeOptions = [
  { label: "Unstitched", value: "Unstitched" }, { label: "Free Size", value: "Free Size" },
  { label: "XS", value: "XS" }, { label: "S", value: "S" }, { label: "M", value: "M" },
  { label: "L", value: "L" }, { label: "XL", value: "XL" }, { label: "XXL", value: "XXL" },
  { label: "3XL", value: "3XL" },
  { label: "28", value: "28" }, { label: "30", value: "30" }, { label: "32", value: "32" },
  { label: "34", value: "34" }, { label: "36", value: "36" }, { label: "38", value: "38" },
  { label: "40", value: "40" }, { label: "42", value: "42" }, { label: "44", value: "44" },
  { label: "46", value: "46" },
];

const typeOptions = [
  { label: "Regular", value: "Regular" }, { label: "Slim Fit", value: "Slim Fit" },
  { label: "Fitted", value: "Fitted" }, { label: "Relaxed", value: "Relaxed" },
  { label: "Classic", value: "Classic" }, { label: "Straight", value: "Straight" },
  { label: "A-Line", value: "A-Line" }, { label: "Flared", value: "Flared" },
  { label: "Stitched", value: "Stitched" }, { label: "Unstitched", value: "Unstitched" },
  { label: "Ready to Wear", value: "Ready to Wear" }, { label: "Semi-Stitched", value: "Semi-Stitched" },
];

export default function ArticleDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = React.use(props.params);
  const articleId = params.id;

  const [article, setArticle] = useState<Article | null>(null);
  const [images, setImages] = useState<ArticleImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingImageId, setDeletingImageId] = useState<number | null>(null);
  const [showAddVariant, setShowAddVariant] = useState(false);
  const [showStock, setShowStock] = useState<{ type: "in" | "out"; variant: Variant } | null>(null);
  const [saving, setSaving] = useState(false);
  const [purposes, setPurposes] = useState<Array<{label: string; value: string}>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [variantForm, setVariantForm] = useState({ sku: "", size: "", type: "Regular", color: "", quantity: "0" });
  const [stockForm, setStockForm] = useState({ qty: "", purpose: "", destination: "", reference: "", note: "" });

  const [showEditArticle, setShowEditArticle] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", collection: "", fabric: "", season: "", category: "", description: "", costPrice: "", sellingPrice: "" });
  const [showPricing, setShowPricing] = useState(false);

  const [deleteVariant, setDeleteVariant] = useState<Variant | null>(null);
  const [deletingVariant, setDeletingVariant] = useState(false);

  const [showHistory, setShowHistory] = useState<Variant | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const { canPerformAction } = usePermissions();

  const fetchArticle = useCallback(async () => {
    try {
      const result = await apiGet(`/articles/${articleId}`);
      setArticle(result.article);
    } catch {
      showToast("Failed to load article details", "error");
    }
  }, [articleId]);

  const fetchImages = useCallback(async () => {
    try {
      const result = await apiGet(`/images?articleId=${articleId}`);
      setImages(result.images || []);
    } catch {
      setImages([]);
    }
  }, [articleId]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      await Promise.all([fetchArticle(), fetchImages()]);
      setLoading(false);
    }
    load();
  }, [fetchArticle, fetchImages]);

  useEffect(() => {
    apiGet("/purposes").then((data) => {
      if (data?.purposes) {
        setPurposes(data.purposes.map((p: Record<string, unknown>) => ({ label: String(p.name), value: String(p.name) })));
      }
    }).catch(() => {});
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("articleId", articleId);
      const token = localStorage.getItem("token");
      const res = await fetch("/api/images", {
        method: "POST",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      showToast("Image uploaded successfully", "success");
      await fetchImages();
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
      showToast("Image deleted successfully", "success");
      setImages((prev) => prev.filter((img) => img.id !== imageId));
    } catch {
      showToast("Failed to delete image", "error");
    } finally {
      setDeletingImageId(null);
    }
  };

  const handleAddVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!variantForm.size || !variantForm.type || !variantForm.color) {
      showToast("Please fill size, type, and color", "error");
      return;
    }
    setSaving(true);
    try {
      await apiPost("/variants", {
        sku: variantForm.sku || undefined,
        articleId: parseInt(articleId),
        size: variantForm.size,
        type: variantForm.type,
        color: variantForm.color,
        quantity: parseInt(variantForm.quantity) || 0,
      });
      showToast("Variant added successfully", "success");
      setShowAddVariant(false);
      setVariantForm({ sku: "", size: "", type: "Regular", color: "", quantity: "0" });
      await fetchArticle();
    } catch (err: unknown) {
      showToast((err as Error).message || "Failed to add variant", "error");
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
      showToast(`Stock ${showStock.type === "in" ? "in" : "out"} recorded`, "success");
      setShowStock(null);
      setStockForm({ qty: "", purpose: "", destination: "", reference: "", note: "" });
      await fetchArticle();
    } catch (err: unknown) {
      showToast((err as Error).message || "Stock operation failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const openEditDialog = () => {
    if (!article) return;
    const hasPricing = (article.costPrice != null && article.costPrice > 0) || (article.sellingPrice != null && article.sellingPrice > 0);
    setEditForm({
      name: article.name || "",
      collection: article.collection || "",
      fabric: article.fabric || "",
      season: article.season || "",
      category: article.category || "",
      description: article.description || "",
      costPrice: article.costPrice != null ? String(article.costPrice) : "",
      sellingPrice: article.sellingPrice != null ? String(article.sellingPrice) : "",
    });
    setShowPricing(hasPricing);
    setShowEditArticle(true);
  };

  const handleEditArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.name || !editForm.category) {
      showToast("Name and category are required", "error");
      return;
    }
    setSaving(true);
    try {
      await apiPut(`/articles/${articleId}`, {
        name: editForm.name,
        collection: editForm.collection || undefined,
        fabric: editForm.fabric || undefined,
        season: editForm.season || undefined,
        category: editForm.category,
        description: editForm.description || undefined,
        costPrice: editForm.costPrice ? parseFloat(editForm.costPrice) : undefined,
        sellingPrice: editForm.sellingPrice ? parseFloat(editForm.sellingPrice) : undefined,
      });
      showToast("Article updated successfully", "success");
      setShowEditArticle(false);
      await fetchArticle();
    } catch (err: unknown) {
      showToast((err as Error).message || "Failed to update article", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteVariant = async () => {
    if (!deleteVariant) return;
    setDeletingVariant(true);
    try {
      await apiDelete(`/variants/${deleteVariant.sku}`);
      showToast("Variant deleted successfully", "success");
      setDeleteVariant(null);
      await fetchArticle();
    } catch (err: unknown) {
      showToast((err as Error).message || "Failed to delete variant", "error");
    } finally {
      setDeletingVariant(false);
    }
  };

  const openHistory = async (variant: Variant) => {
    setShowHistory(variant);
    setLoadingMovements(true);
    try {
      const result = await apiGet(`/stock/movements?sku=${variant.sku}`);
      setMovements(result.movements || []);
    } catch {
      showToast("Failed to load stock movements", "error");
      setMovements([]);
    } finally {
      setLoadingMovements(false);
    }
  };

  const totalPcs = article?.variants?.reduce((sum, v) => sum + (v.quantity || 0), 0) || 0;
  const outOfStockCount = article?.variants?.filter(v => v.quantity === 0).length || 0;
  const lowStockCount = article?.variants?.filter(v => v.quantity > 0 && v.quantity <= 5).length || 0;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading article...</span>
        </div>
      </DashboardLayout>
    );
  }

  if (!article) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Link href="/articles" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Articles
          </Link>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground">Article not found.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Link href="/articles" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Articles
        </Link>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-3">
                <div>
                  <CardTitle className="text-2xl">{article.name}</CardTitle>
                  {article.description && (
                    <p className="text-sm text-muted-foreground mt-1">{article.description}</p>
                  )}
                </div>
                {canPerformAction("edit") && (
                  <Button size="sm" variant="outline" className="gap-1.5 cursor-pointer" onClick={openEditDialog}>
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Badge variant="secondary">{article.category}</Badge>
                <Badge variant="outline">{article.season || "—"}</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Collection</p>
                <p className="text-sm font-medium mt-1">{article.collection}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Fabric</p>
                <p className="text-sm font-medium mt-1">{article.fabric}</p>
              </div>
              {article.costPrice != null && article.costPrice > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Cost Price</p>
                  <p className="text-sm font-medium mt-1">Rs. {article.costPrice.toLocaleString()}</p>
                </div>
              )}
              {article.sellingPrice != null && article.sellingPrice > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Selling Price</p>
                  <p className="text-sm font-medium mt-1">Rs. {article.sellingPrice.toLocaleString()}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Created</p>
                <p className="text-sm font-medium mt-1">
                  {article.createdAt ? new Date(article.createdAt).toLocaleDateString() : "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-xl p-4 text-center">
            <p className="text-xs text-blue-600 uppercase tracking-wider">Variants</p>
            <p className="text-2xl font-bold text-blue-700 mt-1">{article.variants?.length || 0}</p>
          </div>
          <div className="bg-emerald-50 rounded-xl p-4 text-center">
            <p className="text-xs text-emerald-600 uppercase tracking-wider">Total Pieces</p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">{totalPcs.toLocaleString()}</p>
          </div>
          <div className="bg-amber-50 rounded-xl p-4 text-center">
            <p className="text-xs text-amber-600 uppercase tracking-wider">Low Stock</p>
            <p className="text-2xl font-bold text-amber-700 mt-1">{lowStockCount}</p>
          </div>
          <div className="bg-red-50 rounded-xl p-4 text-center">
            <p className="text-xs text-red-600 uppercase tracking-wider">Out of Stock</p>
            <p className="text-2xl font-bold text-red-700 mt-1">{outOfStockCount}</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Variants</CardTitle>
              {canPerformAction("edit") && (
                <Button size="sm" className="gap-2 cursor-pointer" onClick={() => {
                  setVariantForm({ sku: "", size: "", type: "Regular", color: "", quantity: "0" });
                  setShowAddVariant(true);
                }}>
                  <Plus className="w-4 h-4" /> Add Variant
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!article.variants || article.variants.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No variants found. Add your first variant above.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">SKU</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Size</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Color</th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Quantity</th>
                      <th className="text-center py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {article.variants.map((v) => {
                      let statusBadge;
                      if (v.quantity === 0) statusBadge = <Badge variant="destructive">Out of Stock</Badge>;
                      else if (v.quantity <= 5) statusBadge = <Badge variant="warning">Low Stock</Badge>;
                      else statusBadge = <Badge variant="success">In Stock</Badge>;

                      return (
                        <tr key={v.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                          <td className="py-3 px-4 text-sm font-mono text-muted-foreground">{v.sku}</td>
                          <td className="py-3 px-4 text-sm">{v.size}</td>
                          <td className="py-3 px-4 text-sm text-muted-foreground">{v.type}</td>
                          <td className="py-3 px-4 text-sm text-muted-foreground">{v.color}</td>
                          <td className="py-3 px-4 text-sm text-right font-semibold">{v.quantity}</td>
                          <td className="py-3 px-4 text-center">{statusBadge}</td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {canPerformAction("stock_in") && (
                                <button
                                  onClick={() => { setStockForm({ qty: "", purpose: "", destination: "", reference: "", note: "" }); setShowStock({ type: "in", variant: v }); }}
                                  className="p-1.5 rounded-md hover:bg-emerald-50 transition-colors cursor-pointer" title="Stock In"
                                >
                                  <ArrowDownToLine className="w-4 h-4 text-emerald-600" />
                                </button>
                              )}
                              {canPerformAction("stock_out") && (
                                <button
                                  onClick={() => { setStockForm({ qty: "", purpose: "", destination: "", reference: "", note: "" }); setShowStock({ type: "out", variant: v }); }}
                                  className="p-1.5 rounded-md hover:bg-amber-50 transition-colors cursor-pointer" title="Stock Out"
                                >
                                  <ArrowUpFromLine className="w-4 h-4 text-amber-600" />
                                </button>
                              )}
                              <button
                                onClick={() => openHistory(v)}
                                className="p-1.5 rounded-md hover:bg-blue-50 transition-colors cursor-pointer" title="History"
                              >
                                <History className="w-4 h-4 text-blue-600" />
                              </button>
                              {canPerformAction("delete") && (
                                <button
                                  onClick={() => setDeleteVariant(v)}
                                  className="p-1.5 rounded-md hover:bg-red-50 transition-colors cursor-pointer" title="Delete Variant"
                                >
                                  <Trash2 className="w-4 h-4 text-red-600" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-border bg-muted/30">
                      <td colSpan={4} className="py-3 px-4 text-sm font-semibold">Total Pieces</td>
                      <td className="py-3 px-4 text-sm text-right font-bold">{totalPcs.toLocaleString()}</td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Image</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {images.length === 0 ? (
              <div className="space-y-3">
                <div
                  onClick={() => canPerformAction("edit") && !uploading && fileInputRef.current?.click()}
                  className={`border-2 border-dashed border-border rounded-lg p-8 text-center transition-colors ${canPerformAction("edit") ? 'cursor-pointer hover:border-primary/50 hover:bg-accent/30' : ''}`}
                >
                  {uploading ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">Uploading & compressing...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <ImageIcon className="w-10 h-10 text-muted-foreground/50" />
                      <p className="text-sm text-muted-foreground">
                        {!canPerformAction("edit") ? "No image uploaded." : "Click to upload image"}
                      </p>
                      {canPerformAction("edit") && <p className="text-xs text-muted-foreground">JPG, PNG, WebP, GIF (auto-compressed to max 40KB)</p>}
                    </div>
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleUpload} />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative rounded-lg overflow-hidden border border-border">
                  <img src={`/api${images[0].url}`} alt={images[0].alt || "Article image"} className="w-full max-h-72 object-contain bg-muted" />
                </div>
                {canPerformAction("edit") && (
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-2 cursor-pointer"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
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
                )}
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleUpload} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={showAddVariant}
        onClose={() => setShowAddVariant(false)}
        title="Add Variant"
        description={`Add a new variant to "${article?.name}"`}
      >
        <form onSubmit={handleAddVariant} className="space-y-4">
          <FormField label="SKU">
            <Input value={variantForm.sku} onChange={(e) => setVariantForm({ ...variantForm, sku: e.target.value })} placeholder="Leave empty for auto-generation" />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Size" required>
              <SearchSelect options={sizeOptions} placeholder="Select size" value={variantForm.size} onChange={(val) => setVariantForm({ ...variantForm, size: val })} />
            </FormField>
            <FormField label="Type / Fit" required>
              <SearchSelect options={typeOptions} placeholder="Select type" value={variantForm.type} onChange={(val) => setVariantForm({ ...variantForm, type: val })} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Color" required>
              <Input value={variantForm.color} onChange={(e) => setVariantForm({ ...variantForm, color: e.target.value })} placeholder="e.g. Navy, Black" />
            </FormField>
            <FormField label="Initial Quantity">
              <Input type="number" min="0" value={variantForm.quantity} onChange={(e) => setVariantForm({ ...variantForm, quantity: e.target.value })} />
            </FormField>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => setShowAddVariant(false)} className="cursor-pointer">Cancel</Button>
            <Button type="submit" disabled={saving} className="cursor-pointer">{saving ? "Adding..." : "Add Variant"}</Button>
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
                <p className="text-sm font-medium">{showStock.variant.sku}</p>
                <p className="text-xs text-muted-foreground">{showStock.variant.size} / {showStock.variant.color}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Current Stock</p>
                <p className="text-lg font-bold">{showStock.variant.quantity}</p>
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

      <Dialog
        open={showEditArticle}
        onClose={() => setShowEditArticle(false)}
        title="Edit Article"
        description={`Update details for "${article?.name}"`}
      >
        <form onSubmit={handleEditArticle} className="space-y-4">
          <FormField label="Article Name" required>
            <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} placeholder="Article name" />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Category" required>
              <SearchSelect options={categoryOptions} placeholder="Select category" value={editForm.category} onChange={(val) => setEditForm({ ...editForm, category: val })} />
            </FormField>
            <FormField label="Season">
              <SearchSelect options={seasonOptions} placeholder="Select season" value={editForm.season} onChange={(val) => setEditForm({ ...editForm, season: val })} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Collection">
              <Input value={editForm.collection} onChange={(e) => setEditForm({ ...editForm, collection: e.target.value })} placeholder="e.g. Summer 2025" />
            </FormField>
            <FormField label="Fabric">
              <Input value={editForm.fabric} onChange={(e) => setEditForm({ ...editForm, fabric: e.target.value })} placeholder="e.g. Cotton, Silk" />
            </FormField>
          </div>
          <FormField label="Description">
            <Input value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} placeholder="Optional description..." />
          </FormField>
          <div>
            <button
              type="button"
              onClick={() => setShowPricing(!showPricing)}
              className="text-sm text-primary hover:underline cursor-pointer"
            >
              {showPricing ? "Hide Pricing" : "Add Pricing (Optional)"}
            </button>
            {showPricing && (
              <div className="grid grid-cols-2 gap-4 mt-3">
                <FormField label="Cost Price">
                  <Input type="number" min="0" step="0.01" value={editForm.costPrice} onChange={(e) => setEditForm({ ...editForm, costPrice: e.target.value })} placeholder="0.00" />
                </FormField>
                <FormField label="Selling Price">
                  <Input type="number" min="0" step="0.01" value={editForm.sellingPrice} onChange={(e) => setEditForm({ ...editForm, sellingPrice: e.target.value })} placeholder="0.00" />
                </FormField>
              </div>
            )}
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => setShowEditArticle(false)} className="cursor-pointer">Cancel</Button>
            <Button type="submit" disabled={saving} className="cursor-pointer">{saving ? "Saving..." : "Save Changes"}</Button>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        open={!!deleteVariant}
        onClose={() => setDeleteVariant(null)}
        onConfirm={handleDeleteVariant}
        title="Delete Variant"
        message={`Are you sure you want to delete variant ${deleteVariant?.sku}?`}
        confirmLabel="Delete"
        loading={deletingVariant}
      />

      <Dialog
        open={!!showHistory}
        onClose={() => { setShowHistory(null); setMovements([]); }}
        title="Stock Movement History"
        description={`Movements for: ${showHistory?.sku || ""}`}
        className="max-w-2xl"
      >
        {loadingMovements ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Loading movements...</span>
          </div>
        ) : movements.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No stock movements found for this variant.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase">Type</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground uppercase">Qty</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase">Purpose</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase">Destination</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase">Reference</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase">Date</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => (
                  <tr key={m.id} className="border-b border-border last:border-0">
                    <td className="py-2 px-3">
                      <Badge variant={m.type === "IN" ? "success" : "warning"}>{m.type}</Badge>
                    </td>
                    <td className="py-2 px-3 text-sm text-right font-semibold">{m.qty}</td>
                    <td className="py-2 px-3 text-sm text-muted-foreground">{m.purpose || "—"}</td>
                    <td className="py-2 px-3 text-sm text-muted-foreground">{m.destination || "—"}</td>
                    <td className="py-2 px-3 text-sm text-muted-foreground">{m.reference || "—"}</td>
                    <td className="py-2 px-3 text-sm text-muted-foreground">
                      {m.createdAt ? new Date(m.createdAt).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Dialog>
    </DashboardLayout>
  );
}
