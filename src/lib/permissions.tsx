"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { apiGet } from "@/lib/api";

interface PermissionsContextType {
  permissions: Record<string, boolean>;
  role: string;
  loading: boolean;
  refresh: () => void;
  hasPermission: (key: string) => boolean;
  canViewPage: (page: string) => boolean;
  canPerformAction: (action: string) => boolean;
}

const PermissionsContext = createContext<PermissionsContextType>({
  permissions: {},
  role: "",
  loading: true,
  refresh: () => {},
  hasPermission: () => false,
  canViewPage: () => false,
  canPerformAction: () => false,
});

export function PermissionsProvider({ children }: { children: React.ReactNode }) {
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  const fetchPermissions = useCallback(async () => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (!token) {
        setPermissions({});
        setRole("");
        setLoading(false);
        return;
      }
      const data = await apiGet("/permissions/me");
      setPermissions(data.permissions || {});
      setRole(data.role || "");
    } catch {
      setPermissions({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions, pathname]);

  const hasPermission = useCallback(
    (key: string) => {
      if (role === "dev" || role === "admin") return true;
      return permissions[key] === true;
    },
    [permissions, role]
  );

  const canViewPage = useCallback(
    (page: string) => hasPermission(`page:${page}`),
    [hasPermission]
  );

  const canPerformAction = useCallback(
    (action: string) => hasPermission(`action:${action}`),
    [hasPermission]
  );

  return (
    <PermissionsContext.Provider
      value={{ permissions, role, loading, refresh: fetchPermissions, hasPermission, canViewPage, canPerformAction }}
    >
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  return useContext(PermissionsContext);
}
