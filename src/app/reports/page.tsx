"use client";

import React, { useEffect, useState, useCallback } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, type SelectOption } from "@/components/ui/select";
import { apiGet } from "@/lib/api";
import { showToast } from "@/components/ui/toast";
import {
  Download,
  Printer,
  Layers,
  Gem,
  Loader2,
  Tag,
  Package,

  Activity,
  Search,
  X,
  Filter,
  Calendar,
  Scissors,
  ArrowDownToLine,
  ArrowUpFromLine,
} from "lucide-react";

interface FilterOptions {
  sizes: string[];
  variantTypes: string[];
  variantColors: string[];
  collections: string[];
  articleFabrics: string[];
  articleSeasons: string[];
  fabricTypes: string[];
  fabricColors: string[];
  fabricSeasons: string[];
  accessoryCategories: string[];
  accessoryUnits: string[];
  purposes: string[];
  destinations: string[];
}

interface ReportTab {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  endpoint: string;
  description: string;
}

const tabs: ReportTab[] = [
  { id: "stock", label: "Stock", icon: Package, color: "text-blue-600", endpoint: "/reports/stock", description: "Current stock levels for all variants" },
  { id: "movements", label: "Stock Movements", icon: Layers, color: "text-emerald-600", endpoint: "/reports/movements", description: "All stock in/out movements" },
  { id: "fabric", label: "Fabric", icon: Scissors, color: "text-violet-600", endpoint: "/reports/fabric", description: "Fabric inventory balances" },
  { id: "fabric-movements", label: "Fabric Movements", icon: Layers, color: "text-purple-600", endpoint: "/reports/fabric-movements", description: "Fabric in/out movements" },
  { id: "accessories", label: "Accessories", icon: Gem, color: "text-amber-600", endpoint: "/reports/accessories", description: "Accessories inventory" },
  { id: "accessory-movements", label: "Acc. Movements", icon: Layers, color: "text-orange-600", endpoint: "/reports/accessory-movements", description: "Accessory in/out movements" },
  { id: "purpose", label: "Purpose", icon: Tag, color: "text-rose-600", endpoint: "/reports/purpose", description: "Movements by purpose" },

  { id: "activity", label: "Activity Log", icon: Activity, color: "text-gray-600", endpoint: "/reports/activity", description: "User activity audit trail" },
];

const toOptions = (arr: string[]): SelectOption[] => arr.map(v => ({ label: v, value: v }));

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState("stock");
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [reportData, setReportData] = useState<Record<string, unknown> | null>(null);
  const [showFilters, setShowFilters] = useState(true);

  useEffect(() => {
    apiGet("/reports/filter-options").then(setFilterOptions).catch(() => {});
  }, []);

  const activeFiltersCount = Object.values(filters).filter(Boolean).length;

  const clearFilters = () => {
    setFilters({});
  };

  const setFilter = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const buildQueryString = useCallback(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    return params.toString();
  }, [filters]);

  const loadReport = useCallback(async () => {
    const tab = tabs.find(t => t.id === activeTab);
    if (!tab) return;
    setLoading(true);
    try {
      const qs = buildQueryString();
      const url = `${tab.endpoint}${qs ? `?${qs}` : ""}`;
      const data = await apiGet(url);
      setReportData(data);
    } catch {
      showToast("Failed to load report", "error");
      setReportData(null);
    } finally {
      setLoading(false);
    }
  }, [activeTab, buildQueryString]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const downloadExcel = async () => {
    setDownloading(true);
    try {
      const qs = buildQueryString();
      const url = `/api/reports/export/${activeTab}/excel${qs ? `?${qs}` : ""}`;
      const token = localStorage.getItem("token");
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `${activeTab}_report_${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      showToast("Download started", "success");
    } catch {
      showToast("Download failed", "error");
    } finally {
      setDownloading(false);
    }
  };

  const renderFilterFields = () => {
    if (!filterOptions) return null;
    const fo = filterOptions;

    const fields: Record<string, { label: string; type: "select" | "text" | "date"; options?: SelectOption[]; placeholder?: string }[]> = {
      stock: [
        { label: "Size", type: "select", options: toOptions(fo.sizes) },
        { label: "Type", type: "select", options: toOptions(fo.variantTypes) },
        { label: "Color", type: "select", options: toOptions(fo.variantColors) },
        { label: "Collection", type: "select", options: toOptions(fo.collections) },
        { label: "Season", type: "select", options: toOptions(fo.articleSeasons) },
        { label: "Fabric", type: "select", options: toOptions(fo.articleFabrics) },
      ],
      movements: [
        { label: "Purpose", type: "select", options: toOptions(fo.purposes) },
        { label: "Movement Type", type: "select", options: [{ label: "IN", value: "IN" }, { label: "OUT", value: "OUT" }] },
        { label: "Destination", type: "text", placeholder: "Filter destination..." },
      ],
      fabric: [
        { label: "Type", type: "select", options: toOptions(fo.fabricTypes) },
        { label: "Color", type: "select", options: toOptions(fo.fabricColors) },
        { label: "Season", type: "select", options: toOptions(fo.fabricSeasons) },
      ],
      "fabric-movements": [
        { label: "Purpose", type: "select", options: toOptions(fo.purposes) },
        { label: "Movement Type", type: "select", options: [{ label: "IN", value: "IN" }, { label: "OUT", value: "OUT" }] },
      ],
      accessories: [
        { label: "Category", type: "select", options: toOptions(fo.accessoryCategories) },
        { label: "Unit", type: "select", options: toOptions(fo.accessoryUnits) },
      ],
      "accessory-movements": [
        { label: "Purpose", type: "select", options: toOptions(fo.purposes) },
        { label: "Movement Type", type: "select", options: [{ label: "IN", value: "IN" }, { label: "OUT", value: "OUT" }] },
      ],
      purpose: [
        { label: "Purpose", type: "select", options: toOptions(fo.purposes) },
        { label: "Movement Type", type: "select", options: [{ label: "IN", value: "IN" }, { label: "OUT", value: "OUT" }] },
      ],
      activity: [
        { label: "Action", type: "select", options: toOptions(["stock_in", "stock_out", "create", "update", "delete", "fabric_in", "fabric_out", "accessory_in", "accessory_out"]) },
        { label: "Entity", type: "select", options: toOptions(["variant", "article", "fabric", "accessory", "user"]) },
      ],
    };

    const fieldKeyMap: Record<string, string> = {
      "Size": "size", "Type": "type", "Color": "color", "Collection": "collection",
      "Season": "season", "Fabric": "fabric", "Purpose": "purpose", "Movement Type": "movementType",
      "Destination": "destination", "Category": "category", "Unit": "unit",
      "Status": "status", "Priority": "priority", "Action": "action", "Entity": "entity",
    };

    const currentFields = fields[activeTab] || [];

    return (
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, SKU, reference..."
              className="pl-9"
              value={filters.search || ""}
              onChange={(e) => setFilter("search", e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="gap-2 cursor-pointer"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4" />
              Filters
              {activeFiltersCount > 0 && (
                <span className="ml-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </Button>
            {activeFiltersCount > 0 && (
              <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground cursor-pointer" onClick={clearFilters}>
                <X className="w-3 h-3" /> Clear
              </Button>
            )}
          </div>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-muted/30 rounded-lg border border-border">
            {currentFields.map((f) => {
              const key = fieldKeyMap[f.label] || f.label.toLowerCase();
              return (
                <div key={key} className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{f.label}</label>
                  {f.type === "select" && f.options ? (
                    <Select
                      options={f.options}
                      placeholder={`All ${f.label}`}
                      value={filters[key] || ""}
                      onChange={(val) => setFilter(key, val)}
                    />
                  ) : (
                    <Input
                      placeholder={f.placeholder || `Filter ${f.label.toLowerCase()}...`}
                      value={filters[key] || ""}
                      onChange={(e) => setFilter(key, e.target.value)}
                    />
                  )}
                </div>
              );
            })}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Date From</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input type="date" className="pl-9" value={filters.dateFrom || ""} onChange={(e) => setFilter("dateFrom", e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Date To</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input type="date" className="pl-9" value={filters.dateTo || ""} onChange={(e) => setFilter("dateTo", e.target.value)} />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderSummary = () => {
    if (!reportData) return null;
    const r = reportData as Record<string, unknown>;
    const summaryItems: { label: string; value: string | number; color: string }[] = [];

    summaryItems.push({ label: "Records", value: (r.count as number) || 0, color: "bg-blue-50 text-blue-700" });

    if (r.totalPieces !== undefined) summaryItems.push({ label: "Total Pieces", value: r.totalPieces as number, color: "bg-indigo-50 text-indigo-700" });
    if (r.totalMeters !== undefined) summaryItems.push({ label: "Total Meters", value: r.totalMeters as number, color: "bg-violet-50 text-violet-700" });
    if (r.totalQuantity !== undefined) summaryItems.push({ label: "Total Qty", value: r.totalQuantity as number, color: "bg-amber-50 text-amber-700" });
    if (r.totalIn !== undefined) summaryItems.push({ label: "Total IN", value: r.totalIn as number, color: "bg-green-50 text-green-700" });
    if (r.totalOut !== undefined) summaryItems.push({ label: "Total OUT", value: r.totalOut as number, color: "bg-red-50 text-red-700" });
    if (r.totalOrdered !== undefined) summaryItems.push({ label: "Ordered", value: r.totalOrdered as number, color: "bg-cyan-50 text-cyan-700" });
    if (r.totalProduced !== undefined) summaryItems.push({ label: "Produced", value: r.totalProduced as number, color: "bg-emerald-50 text-emerald-700" });
    if (r.totalRejected !== undefined) summaryItems.push({ label: "Rejected", value: r.totalRejected as number, color: "bg-red-50 text-red-700" });

    return (
      <div className="flex flex-wrap gap-3">
        {summaryItems.map(s => (
          <div key={s.label} className={`px-4 py-2 rounded-lg ${s.color}`}>
            <p className="text-xs opacity-75">{s.label}</p>
            <p className="text-lg font-bold">{typeof s.value === "number" ? s.value.toLocaleString() : s.value}</p>
          </div>
        ))}
      </div>
    );
  };

  const renderPurposeTable = () => {
    const r = reportData as Record<string, unknown>;
    const data = (r.data as Array<Record<string, unknown>>) || [];
    if (data.length === 0) return <p className="text-muted-foreground text-center py-8">No data found for the selected filters.</p>;

    return (
      <div className="space-y-4">
        {data.map((item) => (
          <div key={item.purpose as string} className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-base">{item.purpose as string}</h3>
              <Badge variant="secondary">{item.movements as number} movements</Badge>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">Total IN</p>
                <p className="text-lg font-bold text-green-600">{item.totalIn as number}</p>
              </div>
              <div className="bg-red-50 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">Total OUT</p>
                <p className="text-lg font-bold text-red-600">{item.totalOut as number}</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">Net</p>
                <p className="text-lg font-bold text-blue-600">{(item.totalIn as number) - (item.totalOut as number)}</p>
              </div>
            </div>
            {(item.skus as Array<Record<string, unknown>>)?.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-2 font-medium">SKU</th>
                      <th className="text-right p-2 font-medium">IN</th>
                      <th className="text-right p-2 font-medium">OUT</th>
                      <th className="text-right p-2 font-medium">Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(item.skus as Array<Record<string, unknown>>).map((s) => (
                      <tr key={s.sku as string} className="border-b last:border-0">
                        <td className="p-2 font-mono text-xs">{s.sku as string}</td>
                        <td className="p-2 text-right text-green-600">{s.in as number}</td>
                        <td className="p-2 text-right text-red-600">{s.out as number}</td>
                        <td className="p-2 text-right text-blue-600">{(s.in as number) - (s.out as number)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderDataTable = () => {
    if (!reportData) return null;
    const r = reportData as Record<string, unknown>;

    if (activeTab === "purpose") return renderPurposeTable();

    const data = (r.data as Array<Record<string, unknown>>) || [];
    if (data.length === 0) return <p className="text-muted-foreground text-center py-8">No data found for the selected filters.</p>;

    const keys = Object.keys(data[0]).filter(k => typeof data[0][k] !== "object");

    const headerLabels: Record<string, string> = {
      imageUrl: "Image", sku: "SKU", articleName: "Article", collection: "Collection", fabric: "Fabric",
      season: "Season", size: "Size", type: "Type", color: "Color", quantity: "Qty",
      createdAt: "Date", movementType: "In/Out", qty: "Qty", purpose: "Purpose",
      destination: "Destination", reference: "Reference", note: "Note",
      name: "Name", meters: "Meters", category: "Category", unit: "Unit",
      fabricName: "Fabric", fabricType: "Type", fabricColor: "Color",
      accessoryName: "Accessory", orderNumber: "Order #", article: "Article",
      producedQty: "Produced", rejectedQty: "Rejected", status: "Status",
      priority: "Priority", fabricMetersUsed: "Fabric (m)", startDate: "Start",
      dueDate: "Due", completedAt: "Completed", userEmail: "User",
      action: "Action", entity: "Entity", entityId: "ID", details: "Details",
    };

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              {keys.map(k => (
                <th key={k} className="text-left p-2 font-medium whitespace-nowrap">
                  {headerLabels[k] || k.replace(/([A-Z])/g, " $1").trim()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr key={idx} className="border-b last:border-0 hover:bg-muted/30">
                {keys.map(k => {
                  const val = row[k];
                  let cellClass = "p-2 text-xs whitespace-nowrap";
                  let content = String(val ?? "");

                  if (k === "imageUrl") {
                    const rawUrl = String(val);
                    const imgUrl = val ? (rawUrl.startsWith("http") ? rawUrl : rawUrl.startsWith("/api") ? rawUrl : `/api${rawUrl}`) : null;
                    return (
                      <td key={k} className="p-1.5">
                        {imgUrl ? (
                          <img
                            src={imgUrl}
                            alt=""
                            className="w-10 h-10 rounded object-cover border border-border"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                            <Package className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                      </td>
                    );
                  }
                  if (k === "movementType") {
                    return (
                      <td key={k} className={cellClass}>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${val === "IN" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                          {val === "IN" ? <ArrowDownToLine className="w-3 h-3" /> : <ArrowUpFromLine className="w-3 h-3" />}
                          {content}
                        </span>
                      </td>
                    );
                  }
                  if (k === "status") {
                    const statusColors: Record<string, string> = {
                      pending: "bg-yellow-100 text-yellow-700",
                      in_progress: "bg-blue-100 text-blue-700",
                      completed: "bg-green-100 text-green-700",
                      cancelled: "bg-gray-100 text-gray-500",
                    };
                    return (
                      <td key={k} className={cellClass}>
                        <Badge className={statusColors[content] || ""}>{content}</Badge>
                      </td>
                    );
                  }
                  if (k === "priority") {
                    const prColors: Record<string, string> = {
                      low: "bg-gray-100 text-gray-600",
                      normal: "bg-blue-100 text-blue-600",
                      high: "bg-orange-100 text-orange-600",
                      urgent: "bg-red-100 text-red-600",
                    };
                    return (
                      <td key={k} className={cellClass}>
                        <Badge className={prColors[content] || ""}>{content}</Badge>
                      </td>
                    );
                  }
                  if (k === "sku" || k === "orderNumber") cellClass += " font-mono";
                  if ((k === "quantity" || k === "qty" || k === "meters" || k === "producedQty" || k === "rejectedQty") && typeof val === "number") {
                    cellClass += " text-right font-medium";
                  }

                  return <td key={k} className={cellClass}>{content}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const currentTab = tabs.find(t => t.id === activeTab);

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Reports</h1>
            <p className="text-muted-foreground mt-1">View, filter and download business reports</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="gap-2 cursor-pointer"
              onClick={() => window.print()}
              disabled={!reportData}
            >
              <Printer className="w-4 h-4" />
              Print
            </Button>
            <Button
              className="gap-2 cursor-pointer"
              onClick={downloadExcel}
              disabled={downloading || !reportData}
            >
              {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Download Excel
            </Button>
          </div>
        </div>

        <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setFilters({});
                  setReportData(null);
                }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {renderFilterFields()}

        {loading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              <span className="ml-3 text-muted-foreground">Loading report...</span>
            </CardContent>
          </Card>
        ) : reportData ? (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {currentTab && (
                    <div className={currentTab.color}>
                      <currentTab.icon className="w-5 h-5" />
                    </div>
                  )}
                  <div>
                    <CardTitle className="text-base">{(reportData as Record<string, unknown>).report as string}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">{currentTab?.description}</p>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {renderSummary()}
              {renderDataTable()}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
