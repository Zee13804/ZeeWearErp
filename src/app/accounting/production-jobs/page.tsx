"use client";

import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Dialog, FormField, ConfirmDialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";
import { showToast } from "@/components/ui/toast";
import { isAdmin } from "@/lib/auth";
import { Plus, Trash2, Loader2, ArrowRight, Briefcase, Package, Wrench } from "lucide-react";
import Link from "next/link";

interface ProductionJob {
  id: number;
  collection: string;
  description?: string;
  status: string;
  createdAt: string;
  totalOutsourceCost: number;
  totalMaterialCost: number;
  grandTotal: number;
  _count: { workEntries: number };
}

function fmt(n: number) {
  return n.toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function ProductionJobsPage() {
  const canDelete = isAdmin();
  const [jobs, setJobs] = useState<ProductionJob[]>([]);
  const [collections, setCollections] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [form, setForm] = useState({ collection: "", description: "" });

  const load = async () => {
    setLoading(true);
    try {
      const [jRes, cRes] = await Promise.all([
        apiGet("/accounting/production-jobs"),
        apiGet("/accounting/production-jobs/collections"),
      ]);
      setJobs(jRes.jobs || []);
      setCollections(cRes.collections || []);
    } catch {
      showToast("Failed to load production jobs", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.collection.trim()) { showToast("Collection name is required", "error"); return; }
    setSaving(true);
    try {
      await apiPost("/accounting/production-jobs", form);
      showToast("Production job created", "success");
      setShowForm(false);
      setForm({ collection: "", description: "" });
      load();
    } catch (e: any) {
      showToast(e.message || "Failed to create job", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiDelete(`/accounting/production-jobs/${deleteTarget.id}`);
      showToast("Job deleted", "success");
      setDeleteTarget(null);
      load();
    } catch (e: any) {
      showToast(e.message || "Failed to delete job", "error");
    }
  };

  const handleStatusToggle = async (job: ProductionJob) => {
    const newStatus = job.status === "active" ? "completed" : "active";
    try {
      await apiPut(`/accounting/production-jobs/${job.id}`, { status: newStatus });
      showToast(`Job marked as ${newStatus}`, "success");
      load();
    } catch {
      showToast("Failed to update status", "error");
    }
  };

  const filtered = statusFilter === "all" ? jobs : jobs.filter(j => j.status === statusFilter);
  const totalOutsource = filtered.reduce((s, j) => s + j.totalOutsourceCost, 0);
  const totalMaterial = filtered.reduce((s, j) => s + j.totalMaterialCost, 0);
  const totalGrand = filtered.reduce((s, j) => s + j.grandTotal, 0);
  const activeCount = jobs.filter(j => j.status === "active").length;
  const completedCount = jobs.filter(j => j.status === "completed").length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Production Jobs</h1>
            <p className="text-muted-foreground mt-1">Track outsource work and material costs per collection</p>
          </div>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> New Job
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-background rounded-xl border border-border p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Briefcase className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Jobs</p>
                <p className="text-2xl font-bold text-foreground">{activeCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-background rounded-xl border border-border p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <Package className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed Jobs</p>
                <p className="text-2xl font-bold text-foreground">{completedCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-background rounded-xl border border-border p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                <Wrench className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Cost (Grand)</p>
                <p className="text-2xl font-bold text-orange-600">Rs {fmt(totalGrand)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Outsource: Rs {fmt(totalOutsource)} &middot; Material: Rs {fmt(totalMaterial)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {["all", "active", "completed"].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
                statusFilter === s
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No production jobs found</p>
            <p className="text-sm mt-1">Create a job to start tracking outsource costs per collection</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(job => (
              <div key={job.id} className="bg-background rounded-xl border border-border p-5 space-y-3 hover:border-primary/40 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate">{job.collection}</h3>
                    {job.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{job.description}</p>
                    )}
                  </div>
                  <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${
                    job.status === "active"
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                      : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                  }`}>
                    {job.status}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-lg bg-muted/50 p-2.5">
                    <p className="text-xs text-muted-foreground">Entries</p>
                    <p className="text-sm font-semibold text-foreground mt-0.5">{job._count.workEntries}</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-2.5">
                    <p className="text-xs text-muted-foreground">Outsource</p>
                    <p className="text-sm font-semibold text-orange-600 mt-0.5">Rs {fmt(job.totalOutsourceCost)}</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-2.5">
                    <p className="text-xs text-muted-foreground">Material</p>
                    <p className="text-sm font-semibold text-blue-600 mt-0.5">Rs {fmt(job.totalMaterialCost)}</p>
                  </div>
                </div>
                <div className="rounded-lg bg-orange-50 dark:bg-orange-900/20 p-2.5">
                  <p className="text-xs text-muted-foreground">Grand Total</p>
                  <p className="text-sm font-bold text-orange-700 dark:text-orange-400 mt-0.5">Rs {fmt(job.grandTotal)}</p>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Link
                    href={`/accounting/production-jobs/${job.id}`}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                  >
                    View Details <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  <button
                    onClick={() => handleStatusToggle(job)}
                    className="py-1.5 px-2.5 rounded-lg border border-border text-xs text-muted-foreground hover:bg-muted transition-colors"
                    title={job.status === "active" ? "Mark as completed" : "Mark as active"}
                  >
                    {job.status === "active" ? "Complete" : "Reopen"}
                  </button>
                  {canDelete && (
                    <button
                      onClick={() => setDeleteTarget({ id: job.id, name: job.collection })}
                      className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <Dialog title="New Production Job" onClose={() => { setShowForm(false); setForm({ collection: "", description: "" }); }}>
          <div className="space-y-4">
            <FormField label="Collection Name *">
              <Input
                value={form.collection}
                onChange={e => setForm(f => ({ ...f, collection: e.target.value }))}
                placeholder="e.g. Summer Lawn 2025"
                list="collections-list"
              />
              <datalist id="collections-list">
                {collections.map(c => <option key={c} value={c} />)}
              </datalist>
            </FormField>
            <FormField label="Description">
              <Input
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Optional notes about this production job"
              />
            </FormField>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setShowForm(false); setForm({ collection: "", description: "" }); }}>Cancel</Button>
              <Button onClick={handleCreate} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Create Job
              </Button>
            </div>
          </div>
        </Dialog>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete Production Job"
          message={`Delete job for "${deleteTarget.name}"? This will fail if work entries exist.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          confirmLabel="Delete"
          variant="danger"
        />
      )}
    </DashboardLayout>
  );
}
