"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Scissors } from "lucide-react";
import { apiPost } from "@/lib/api";
import { useToast } from "@/components/ui/toast";

export default function LoginPage() {
  const router = useRouter();
  const { success, error: showError } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (saved) {
      document.documentElement.setAttribute('data-theme', saved);
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await apiPost("/auth/login", { email, password });
      localStorage.setItem("token", data.token);
      success("Signed in successfully.");
      router.push("/dashboard");
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-blue-700 to-indigo-900" />
        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Scissors className="w-6 h-6" />
            </div>
            <span className="text-2xl font-bold">Zee Wear ERP</span>
          </div>
          <h1 className="text-4xl font-bold leading-tight mb-4">
            Manage your garment<br />business with ease
          </h1>
          <p className="text-blue-100 text-lg max-w-md">
            Track articles, variants, fabric, and accessories all in one place.
            Get real-time insights and reports to make smarter decisions.
          </p>
          <div className="mt-12 grid grid-cols-3 gap-6">
            <div className="bg-white/10 backdrop-blur rounded-xl p-4">
              <div className="text-2xl font-bold">2.4K</div>
              <div className="text-blue-200 text-sm">Articles</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4">
              <div className="text-2xl font-bold">12.8K</div>
              <div className="text-blue-200 text-sm">Variants</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4">
              <div className="text-2xl font-bold">98%</div>
              <div className="text-blue-200 text-sm">Uptime</div>
            </div>
          </div>
        </div>
        <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-white/5 rounded-full" />
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full" />
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="w-full max-w-md border-0 shadow-none lg:shadow-none">
          <CardHeader className="space-y-2 text-center">
            <div className="lg:hidden flex items-center justify-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-white font-bold text-sm">Z</span>
              </div>
              <span className="font-semibold text-lg">Zee Wear ERP</span>
            </div>
            <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
            <CardDescription>Enter your credentials to access your account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="email">
                  Email
                </label>
                <Input id="email" type="email" placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground" htmlFor="password">
                    Password
                  </label>
                  <button type="button" onClick={() => { showError("Contact your administrator to reset your password."); }} className="text-xs text-primary hover:underline cursor-pointer">
                    Forgot password?
                  </button>
                </div>
                <Input id="password" type="password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full h-11 text-base cursor-pointer" disabled={loading}>
                {loading ? "Signing in..." : "Sign in"}
              </Button>
            </form>
            <p className="text-center text-sm text-muted-foreground mt-6">
              Contact system administrator to get an account.
            </p>
            <div className="border-t border-border pt-4 mt-4 text-center space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Support: Zeshan Ahmad</p>
              <p className="text-xs text-muted-foreground">
                <a href="mailto:zeeshanahmad106@gmail.com" className="hover:text-primary transition-colors">zeeshanahmad106@gmail.com</a>
                {" | "}
                <a href="tel:+923117597815" className="hover:text-primary transition-colors">+92 311 7597815</a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
