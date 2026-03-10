"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiGet } from "@/lib/api";
import { showToast } from "@/components/ui/toast";
import {
  FileText,
  Scissors,
  Gem,
  Package,
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Loader2,
  Activity,
} from "lucide-react";

interface DashboardData {
  counts: { articles: number; variants: number; fabrics: number; accessories: number };
  inventory: { totalPieces: number; totalFabricMeters: number; lowStockCount: number };
  lowStockVariants: Array<{ sku: string; article: string; size: string; color: string; quantity: number }>;

  purposeBreakdown: Array<{ purpose: string; totalIn: number; totalOut: number }>;
  recentMovements: Array<{ id: number; sku: string; type: string; qty: number; purpose: string; destination: string; date: string }>;
  recentActivity: Array<{ id: number; action: string; entity: string; details: string; user: string; date: string }>;
}

function formatNum(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toLocaleString();
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function actionLabel(action: string): string {
  const map: Record<string, string> = {
    STOCK_IN: "Stock In",
    STOCK_OUT: "Stock Out",
    CREATE_ARTICLE: "Created Article",
    CREATE_VARIANT: "Created Variant",
    CREATE_FABRIC: "Created Fabric",
    UPDATE_FABRIC: "Updated Fabric",
    CREATE_ACCESSORY: "Created Accessory",
    FABRIC_IN: "Fabric In",
    FABRIC_OUT: "Fabric Out",
    ACCESSORY_IN: "Accessory In",
    ACCESSORY_OUT: "Accessory Out",
    UPLOAD_IMAGE: "Uploaded Image",
    DELETE_IMAGE: "Deleted Image",
    CREATE_ORDER: "Created Order",
    COMPLETE_ORDER: "Completed Order",
    CONSUME_FABRIC: "Consumed Fabric",
  };
  return map[action] || action.replace(/_/g, " ");
}

function actionColor(action: string): string {
  if (action.includes("IN") || action.includes("CREATE") || action.includes("COMPLETE")) return "text-emerald-600 bg-emerald-50";
  if (action.includes("OUT") || action.includes("DELETE") || action.includes("CONSUME")) return "text-amber-600 bg-amber-50";
  return "text-blue-600 bg-blue-50";
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const result = await apiGet("/dashboard/stats");
        setData(result);
      } catch {
        showToast("Failed to load dashboard data", "error");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!data) {
    return (
      <DashboardLayout>
        <div className="text-center py-24 text-muted-foreground">Failed to load dashboard.</div>
      </DashboardLayout>
    );
  }

  const maxPurpose = Math.max(...data.purposeBreakdown.map(p => Math.max(p.totalIn, p.totalOut)), 1);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Real-time overview of your garment business.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link href="/articles">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-50 text-blue-600">
                    <FileText className="w-5 h-5" />
                  </div>
                  <span className="text-xs text-muted-foreground">Catalog</span>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-bold">{formatNum(data.counts.articles)}</div>
                  <div className="text-sm text-muted-foreground">Articles</div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/variants">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-emerald-50 text-emerald-600">
                    <Package className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-semibold text-emerald-600">{formatNum(data.inventory.totalPieces)} pcs</span>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-bold">{formatNum(data.counts.variants)}</div>
                  <div className="text-sm text-muted-foreground">Variants</div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/fabric">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-violet-50 text-violet-600">
                    <Scissors className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-semibold text-violet-600">{data.inventory.totalFabricMeters}m</span>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-bold">{formatNum(data.counts.fabrics)}</div>
                  <div className="text-sm text-muted-foreground">Fabric Types</div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/accessories">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-50 text-amber-600">
                    <Gem className="w-5 h-5" />
                  </div>
                  <span className="text-xs text-muted-foreground">Inventory</span>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-bold">{formatNum(data.counts.accessories)}</div>
                  <div className="text-sm text-muted-foreground">Accessories</div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.inventory.lowStockCount > 0 ? (
            <Card className="hover:shadow-md transition-shadow border-amber-200">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-50 text-red-600">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-semibold">Low Stock Alert</span>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{data.inventory.lowStockCount}</div>
                  <div className="text-xs text-muted-foreground">variants with 5 or fewer pieces</div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="hover:shadow-md transition-shadow border-emerald-200">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-50 text-emerald-600">
                    <Package className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-semibold">Stock Status</span>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-emerald-600">All Good</div>
                  <div className="text-xs text-muted-foreground">No low stock warnings</div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {data.purposeBreakdown.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Stock by Purpose</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.purposeBreakdown.slice(0, 8).map((p) => (
                    <div key={p.purpose} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium truncate">{p.purpose}</span>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-emerald-600 flex items-center gap-1">
                            <ArrowDownToLine className="w-3 h-3" />{formatNum(p.totalIn)}
                          </span>
                          <span className="text-amber-600 flex items-center gap-1">
                            <ArrowUpFromLine className="w-3 h-3" />{formatNum(p.totalOut)}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1 h-2">
                        <div className="bg-emerald-400 rounded-full transition-all" style={{ width: `${Math.max((p.totalIn / maxPurpose) * 100, 2)}%` }} />
                        <div className="bg-amber-400 rounded-full transition-all" style={{ width: `${Math.max((p.totalOut / maxPurpose) * 100, 2)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Stock In</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> Stock Out</span>
                </div>
              </CardContent>
            </Card>
          )}

          {data.lowStockVariants.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    Low Stock Variants
                  </CardTitle>
                  <Badge variant="destructive">{data.lowStockVariants.length}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-3 text-[10px] font-medium text-muted-foreground uppercase">SKU</th>
                        <th className="text-left py-2 px-3 text-[10px] font-medium text-muted-foreground uppercase">Article</th>
                        <th className="text-left py-2 px-3 text-[10px] font-medium text-muted-foreground uppercase">Size</th>
                        <th className="text-right py-2 px-3 text-[10px] font-medium text-muted-foreground uppercase">Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.lowStockVariants.map((v) => (
                        <tr key={v.sku} className="border-b border-border last:border-0">
                          <td className="py-2 px-3 text-xs font-mono">{v.sku}</td>
                          <td className="py-2 px-3 text-xs truncate max-w-[120px]">{v.article}</td>
                          <td className="py-2 px-3 text-xs text-muted-foreground">{v.size}</td>
                          <td className="py-2 px-3 text-xs text-right">
                            <span className={`font-bold ${v.quantity === 0 ? 'text-red-600' : 'text-amber-600'}`}>{v.quantity}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {data.lowStockVariants.length === 0 && data.purposeBreakdown.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Recent Stock Movements</CardTitle>
              </CardHeader>
              <CardContent>
                {data.recentMovements.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No stock movements yet.</p>
                ) : (
                  <div className="space-y-2">
                    {data.recentMovements.slice(0, 8).map((m) => (
                      <div key={m.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded flex items-center justify-center ${m.type === 'IN' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                            {m.type === 'IN' ? <ArrowDownToLine className="w-3 h-3" /> : <ArrowUpFromLine className="w-3 h-3" />}
                          </div>
                          <div>
                            <span className="text-xs font-mono font-medium">{m.sku}</span>
                            <span className="text-xs text-muted-foreground ml-2">{m.purpose}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-bold ${m.type === 'IN' ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {m.type === 'IN' ? '+' : '-'}{m.qty}
                          </span>
                          <span className="text-[10px] text-muted-foreground w-12 text-right">{timeAgo(m.date)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-base">Recent Activity</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {data.recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No activity recorded yet.</p>
            ) : (
              <div className="space-y-1">
                {data.recentActivity.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
                    <div className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${actionColor(a.action)}`}>
                      {actionLabel(a.action)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground truncate">{a.details || `${a.entity} updated`}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-[10px] text-muted-foreground">{a.user.split('@')[0]}</div>
                      <div className="text-[10px] text-muted-foreground">{timeAgo(a.date)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {data.recentMovements.length > 0 && (data.lowStockVariants.length > 0 || data.purposeBreakdown.length === 0) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Recent Stock Movements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-3 text-[10px] font-medium text-muted-foreground uppercase">Type</th>
                      <th className="text-left py-2 px-3 text-[10px] font-medium text-muted-foreground uppercase">SKU</th>
                      <th className="text-right py-2 px-3 text-[10px] font-medium text-muted-foreground uppercase">Qty</th>
                      <th className="text-left py-2 px-3 text-[10px] font-medium text-muted-foreground uppercase">Purpose</th>
                      <th className="text-left py-2 px-3 text-[10px] font-medium text-muted-foreground uppercase">Destination</th>
                      <th className="text-right py-2 px-3 text-[10px] font-medium text-muted-foreground uppercase">When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentMovements.map((m) => (
                      <tr key={m.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                        <td className="py-2 px-3">
                          <Badge variant={m.type === 'IN' ? 'success' : 'warning'} className="text-[10px]">{m.type}</Badge>
                        </td>
                        <td className="py-2 px-3 text-xs font-mono">{m.sku}</td>
                        <td className="py-2 px-3 text-xs text-right font-bold">{m.qty}</td>
                        <td className="py-2 px-3 text-xs text-muted-foreground">{m.purpose}</td>
                        <td className="py-2 px-3 text-xs text-muted-foreground">{m.destination || '-'}</td>
                        <td className="py-2 px-3 text-xs text-right text-muted-foreground">{timeAgo(m.date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
