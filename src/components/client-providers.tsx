"use client";

import { AuthGuard } from "./auth-guard";
import { ToastProvider } from "./ui/toast";
import { PermissionsProvider } from "@/lib/permissions";

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <AuthGuard>
        <PermissionsProvider>{children}</PermissionsProvider>
      </AuthGuard>
    </ToastProvider>
  );
}
