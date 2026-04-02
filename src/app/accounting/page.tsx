"use client";

import React, { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { apiGet } from "@/lib/api";
import Link from "next/link";
import {
  Wallet, TrendingUp, TrendingDown, ShoppingCart, AlertCircle,
  Users, FileText, Receipt, Briefcase, BarChart3, ArrowRight, Loader2
} from "lucide-react";

interface DashboardData {
  totalCash: number;
  monthlyRevenue: number;
  monthlyExpenses: number;
  monthlyPurchases: number;
  monthlyLabour: number;
  monthlySalaries: number;
  pendingReceivable: number;
  supplierDebt: number;
  accounts: Array<{ id: number; name: string; type: string; balance: number }>;
}

function fmt(n: number) {
  return n.toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function StatCard({ icon: Icon, label, value, color, sub }: { icon: React.ElementType; label: string; value: string; color: string; sub?: string }) {
  return (
    <div className="bg-background rounded-xl border border-border p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground mb-1">{label}</p>
          <p className={`text-2xl font-bold ${color}`}>Rs {value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        </div>
        <div className={`p-2.5 rounded-lg bg-muted`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
      </div>
    </div>
  );
}

const quickLinks = [
  { href: "/accounting/accounts", icon: Wallet, label: "Accounts", desc: "Manage cash & bank accounts" },
  { href: "/accounting/suppliers", icon: ShoppingCart, label: "Suppliers", desc: "Purchases & supplier payments" },
  { href: "/accounting/invoices", icon: FileText, label: "Invoices", desc: "Customer invoices & receipts" },
  { href: "/accounting/expenses", icon: Receipt, label: "Expenses", desc: "Track business expenses" },
  { href: "/accounting/employees", icon: Users, label: "Employees", desc: "Payroll, advances & labour" },
  { href: "/accounting/reports", icon: BarChart3, label: "Reports", desc: "Financial reports & ledger" },
];

export default function AccountingDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet("/accounting/reports/dashboard")
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Accounting</h1>
          <p className="text-muted-foreground mt-1">Financial overview and management</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : data ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={Wallet} label="Total Cash & Bank" value={fmt(data.totalCash)} color="text-emerald-600" sub="All accounts combined" />
              <StatCard icon={TrendingUp} label="This Month Revenue" value={fmt(data.monthlyRevenue)} color="text-blue-600" sub="Invoice payments received" />
              <StatCard icon={AlertCircle} label="Pending Receivable" value={fmt(data.pendingReceivable)} color="text-amber-600" sub="Unpaid invoices" />
              <StatCard icon={Briefcase} label="Supplier Debt" value={fmt(data.supplierDebt)} color="text-purple-600" sub="Amount owed to suppliers" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-background rounded-xl border border-border p-4">
                <p className="text-xs text-muted-foreground">Monthly Expenses</p>
                <p className="text-lg font-bold text-red-600 mt-1">Rs {fmt(data.monthlyExpenses)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Business expenses</p>
              </div>
              <div className="bg-background rounded-xl border border-border p-4">
                <p className="text-xs text-muted-foreground">Monthly Purchases</p>
                <p className="text-lg font-bold text-orange-600 mt-1">Rs {fmt(data.monthlyPurchases)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Supplier purchases</p>
              </div>
              <div className="bg-background rounded-xl border border-border p-4">
                <p className="text-xs text-muted-foreground">Monthly Salaries</p>
                <p className="text-lg font-bold text-violet-600 mt-1">Rs {fmt(data.monthlySalaries)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Salary disbursed</p>
              </div>
              <div className="bg-background rounded-xl border border-border p-4">
                <p className="text-xs text-muted-foreground">Monthly Labour</p>
                <p className="text-lg font-bold text-sky-600 mt-1">Rs {fmt(data.monthlyLabour)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Labour payments</p>
              </div>
            </div>

            {data.accounts.length > 0 && (
              <div className="bg-background rounded-xl border border-border p-5">
                <h2 className="text-sm font-semibold text-foreground mb-4">Account Balances</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {data.accounts.map(acc => (
                    <div key={acc.id} className="p-3 rounded-lg bg-muted/40 border border-border">
                      <p className="text-xs text-muted-foreground truncate">{acc.name}</p>
                      <p className={`text-lg font-bold mt-1 ${acc.balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        Rs {fmt(acc.balance)}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">{acc.type}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <p>No accounts set up yet. Start by creating your first account.</p>
          </div>
        )}

        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">Quick Access</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {quickLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-start gap-3 p-4 bg-background border border-border rounded-xl hover:border-primary/50 hover:bg-accent/30 transition-colors group"
              >
                <div className="p-2 rounded-lg bg-muted group-hover:bg-primary/10 transition-colors">
                  <link.icon className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{link.label}</p>
                  <p className="text-xs text-muted-foreground truncate">{link.desc}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground/50 shrink-0 mt-0.5" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
