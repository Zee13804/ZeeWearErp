"use client";

import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { apiGet } from "@/lib/api";
import { showToast } from "@/components/ui/toast";
import { Loader2, ArrowLeft, Users, ChevronDown, ChevronRight, CheckCircle, AlertCircle, ExternalLink, Printer } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface JobBreakdown {
  jobId: number;
  collection: string;
  status: string;
  totalWork: number;
  totalPaid: number;
  totalAdvance: number;
  totalReceived: number;
  balance: number;
}

interface VendorRow {
  vendorName: string;
  totalWork: number;
  totalPaid: number;
  totalAdvance: number;
  totalReceived: number;
  balance: number;
  jobs: JobBreakdown[];
}

function fmt(n: number) {
  return n.toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

interface CompanyInfo { name?: string; tagline?: string; address?: string; phone?: string; email?: string }

export default function VendorLedgerPage() {
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [company, setCompany] = useState<CompanyInfo>({ name: "Zee Wear" });

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiGet("/accounting/production-jobs/vendor-ledger");
      setVendors(res.vendors || []);
    } catch {
      showToast("Failed to load vendor ledger", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    apiGet("/accounting/settings").then(s => setCompany({
      name: s.companyName || "Zee Wear",
      tagline: s.companyTagline,
      address: s.companyAddress,
      phone: s.companyPhone,
      email: s.companyEmail,
    })).catch(() => {});
  }, []);

  const toggle = (name: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const totalBalance = vendors.reduce((s, v) => s + v.balance, 0);
  const totalWork = vendors.reduce((s, v) => s + v.totalWork, 0);
  const totalPaid = vendors.reduce((s, v) => s + v.totalReceived, 0);
  const pendingVendors = vendors.filter(v => v.balance > 0).length;

  const printLedger = () => window.print();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-start gap-3 print:hidden">
          <Link
            href="/accounting/production-jobs"
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">Vendor Ledger</h1>
            <p className="text-muted-foreground mt-1 text-sm">All vendors across all production jobs</p>
          </div>
          <Button variant="outline" size="sm" onClick={printLedger} className="gap-2 cursor-pointer">
            <Printer className="w-4 h-4" /> Print
          </Button>
        </div>

        <div className="printable-area space-y-6">
          <div className="hidden print:block mb-4 pb-3 border-b border-gray-300">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-lg font-bold">{company.name || "Zee Wear"}</h2>
                {company.tagline && <p className="text-xs text-gray-600">{company.tagline}</p>}
                {company.address && <p className="text-xs">{company.address}</p>}
                {(company.phone || company.email) && (
                  <p className="text-xs">{[company.phone, company.email].filter(Boolean).join(" · ")}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">Vendor Ledger</p>
                <p className="text-xs text-gray-600">Printed: {new Date().toLocaleString("en-PK")}</p>
              </div>
            </div>
          </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-background rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground">Total Vendors</p>
            <p className="text-2xl font-bold text-foreground mt-1">{vendors.length}</p>
          </div>
          <div className="bg-background rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground">Pending Payment</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{pendingVendors}</p>
          </div>
          <div className="bg-background rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground">Total Work Cost</p>
            <p className="text-xl font-bold text-orange-600 mt-1">Rs {fmt(totalWork)}</p>
          </div>
          <div className={`rounded-xl border-2 p-4 ${
            totalBalance <= 0
              ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700"
              : "bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700"
          }`}>
            <p className={`text-xs font-medium ${totalBalance <= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}`}>
              Total Balance Due
            </p>
            <p className={`text-xl font-bold mt-1 ${totalBalance <= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}`}>
              Rs {fmt(Math.max(0, totalBalance))}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : vendors.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No vendor data yet</p>
            <p className="text-sm mt-1">Add work entries in production jobs to see vendor ledger</p>
          </div>
        ) : (
          <div className="bg-background rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left py-3 px-4 text-xs text-muted-foreground font-medium">Vendor</th>
                  <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium">Work Total</th>
                  <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium hidden sm:table-cell">Total Paid</th>
                  <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium">Balance Due</th>
                  <th className="py-3 px-4 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {vendors.map(v => (
                  <React.Fragment key={v.vendorName}>
                    <tr
                      className={`border-b border-border cursor-pointer transition-colors ${
                        v.balance > 0
                          ? "bg-amber-50/50 dark:bg-amber-900/10 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                          : "hover:bg-muted/30"
                      }`}
                      onClick={() => toggle(v.vendorName)}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {v.balance > 0 ? (
                            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                          ) : (
                            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                          )}
                          <span className="font-semibold text-foreground">{v.vendorName}</span>
                          <span className="text-xs text-muted-foreground hidden sm:inline">({v.jobs.length} job{v.jobs.length !== 1 ? "s" : ""})</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-orange-600">
                        Rs {fmt(v.totalWork)}
                      </td>
                      <td className="py-3 px-4 text-right text-emerald-600 hidden sm:table-cell">
                        {v.totalReceived > 0
                          ? <span>Rs {fmt(v.totalReceived)}{v.totalAdvance > 0 && <span className="text-xs text-muted-foreground ml-1">({fmt(v.totalAdvance)} adv)</span>}</span>
                          : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {v.balance <= 0 ? (
                          <span className="text-emerald-600 font-semibold flex items-center justify-end gap-1">
                            <CheckCircle className="w-3.5 h-3.5" /> Cleared
                          </span>
                        ) : (
                          <span className="font-bold text-red-600">Rs {fmt(v.balance)}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {expanded.has(v.vendorName)
                          ? <ChevronDown className="w-4 h-4" />
                          : <ChevronRight className="w-4 h-4" />
                        }
                      </td>
                    </tr>

                    {expanded.has(v.vendorName) && (
                      <tr className="border-b border-border">
                        <td colSpan={6} className="px-4 py-3 bg-muted/20">
                          <div className="rounded-lg border border-border overflow-hidden">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-border bg-muted/40">
                                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Job (Collection)</th>
                                  <th className="text-center py-2 px-3 text-muted-foreground font-medium">Status</th>
                                  <th className="text-right py-2 px-3 text-muted-foreground font-medium">Work</th>
                                  <th className="text-right py-2 px-3 text-muted-foreground font-medium hidden sm:table-cell">Advance</th>
                                  <th className="text-right py-2 px-3 text-muted-foreground font-medium hidden sm:table-cell">Paid</th>
                                  <th className="text-right py-2 px-3 text-muted-foreground font-medium">Balance</th>
                                  <th className="py-2 px-3 w-6"></th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border">
                                {v.jobs.map(j => (
                                  <tr key={j.jobId} className={`${j.balance > 0 ? "bg-amber-50/30 dark:bg-amber-900/10" : ""}`}>
                                    <td className="py-2 px-3 font-medium text-foreground">{j.collection}</td>
                                    <td className="py-2 px-3 text-center">
                                      <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${
                                        j.status === "active"
                                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                          : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                      }`}>
                                        {j.status}
                                      </span>
                                    </td>
                                    <td className="py-2 px-3 text-right text-orange-600 font-semibold">
                                      {j.totalWork > 0 ? `Rs ${fmt(j.totalWork)}` : <span className="text-muted-foreground">—</span>}
                                    </td>
                                    <td className="py-2 px-3 text-right text-blue-600 hidden sm:table-cell">
                                      {j.totalAdvance > 0 ? `Rs ${fmt(j.totalAdvance)}` : <span className="text-muted-foreground">—</span>}
                                    </td>
                                    <td className="py-2 px-3 text-right text-emerald-600 hidden sm:table-cell">
                                      {j.totalPaid > 0 ? `Rs ${fmt(j.totalPaid)}` : <span className="text-muted-foreground">—</span>}
                                    </td>
                                    <td className="py-2 px-3 text-right">
                                      {j.balance <= 0 ? (
                                        <span className="text-emerald-600 font-semibold">Cleared</span>
                                      ) : (
                                        <span className="font-bold text-red-600">Rs {fmt(j.balance)}</span>
                                      )}
                                    </td>
                                    <td className="py-2 px-3">
                                      <Link
                                        href={`/accounting/production-jobs/${j.jobId}`}
                                        className="text-primary hover:text-primary/80"
                                        title="Open job"
                                        onClick={e => e.stopPropagation()}
                                      >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                      </Link>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-muted/30 border-t-2 border-border">
                  <td className="py-3 px-4 font-semibold text-foreground">Total</td>
                  <td className="py-3 px-4 text-right font-bold text-orange-600">Rs {fmt(totalWork)}</td>
                  <td className="py-3 px-4 text-right font-bold text-emerald-600 hidden sm:table-cell">Rs {fmt(totalPaid)}</td>
                  <td className="py-3 px-4 text-right font-bold">
                    <span className={totalBalance <= 0 ? "text-emerald-600" : "text-red-600"}>
                      Rs {fmt(Math.max(0, totalBalance))}
                    </span>
                  </td>
                  <td className="py-3 px-4"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
        </div>
      </div>
    </DashboardLayout>
  );
}
