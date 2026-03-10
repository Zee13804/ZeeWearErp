"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { isAdmin, decodeToken } from "@/lib/auth";
import { apiGet } from "@/lib/api";

const PUBLIC_ROUTES = ["/login"];
const ADMIN_ROUTES = ["/users"];

const PAGE_ROUTE_MAP: Record<string, string> = {
  "/dashboard": "dashboard",
  "/articles": "articles",
  "/variants": "variants",
  "/fabric": "fabric",
  "/accessories": "accessories",
  "/production-orders": "production_orders",
  "/reports": "reports",
  "/settings": "settings",
  "/import": "import",
};

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);

  const checkAccess = useCallback(async () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const isPublic = PUBLIC_ROUTES.includes(pathname);
    const isAdminRoute = ADMIN_ROUTES.includes(pathname);

    if (isPublic) {
      setAuthorized(true);
      return;
    }

    if (!token) {
      router.replace("/login");
      return;
    }

    if (isAdminRoute && !isAdmin()) {
      router.replace("/dashboard");
      return;
    }

    const decoded = decodeToken();
    const role = decoded?.role || "";

    if (role === "dev" || role === "admin") {
      setAuthorized(true);
      return;
    }

    const basePath = "/" + pathname.split("/")[1];
    const pageKey = PAGE_ROUTE_MAP[basePath];

    if (pageKey) {
      try {
        const data = await apiGet("/permissions/me");
        const perms = data.permissions || {};
        if (perms[`page:${pageKey}`] === false) {
          router.replace("/dashboard");
          return;
        }
      } catch {}
    }

    setAuthorized(true);
  }, [pathname, router]);

  useEffect(() => {
    setAuthorized(false);
    checkAccess();
  }, [checkAccess]);

  if (!authorized) {
    return null;
  }

  return <>{children}</>;
}
