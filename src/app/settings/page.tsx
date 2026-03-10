"use client";

import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { showToast } from "@/components/ui/toast";
import { apiGet, apiPost, apiDelete } from "@/lib/api";
import { Plus, Trash2, Tag, Lock, Download, Upload, Database, Loader2, Image, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { isAdmin } from "@/lib/auth";
import { usePermissions } from "@/lib/permissions";

interface Purpose {
  id: number;
  name: string;
  type: string;
  isActive: boolean;
}

export default function SettingsPage() {
  const [purposes, setPurposes] = useState<Purpose[]>([]);
  const [newPurpose, setNewPurpose] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [downloadingBackup, setDownloadingBackup] = useState(false);
  const [importingBackup, setImportingBackup] = useState(false);
  const [lastImportResult, setLastImportResult] = useState<any>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const { canPerformAction } = usePermissions();

  const handleDownloadBackup = async () => {
    setDownloadingBackup(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/backup", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Backup download failed");
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `erp-backup-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      showToast("Backup downloaded successfully", "success");
    } catch (err: any) {
      showToast(err.message || "Failed to download backup", "error");
    } finally {
      setDownloadingBackup(false);
    }
  };

  const handleImportBackup = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setImportingBackup(true);
      try {
        const text = await file.text();
        const json = JSON.parse(text);

        if (!json.data && !json.exportedAt) {
          showToast("Invalid backup file. Please select a valid ERP backup JSON file.", "error");
          setImportingBackup(false);
          return;
        }

        const token = localStorage.getItem("token");
        const res = await fetch("/api/backup/import", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: text,
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Import failed");
        }

        const result = await res.json();
        const c = result.imported;
        setLastImportResult(c);
        const parts = [];
        if (c.articles) parts.push(`${c.articles} articles`);
        if (c.variants) parts.push(`${c.variants} variants`);
        if (c.fabrics) parts.push(`${c.fabrics} fabrics`);
        if (c.accessories) parts.push(`${c.accessories} accessories`);
        if (c.purposes) parts.push(`${c.purposes} purposes`);
        if (c.images) parts.push(`${c.images} images`);
        if (c.imageFiles) parts.push(`${c.imageFiles} image files`);
        if (c.stockMovements) parts.push(`${c.stockMovements} stock movements`);
        if (c.fabricMovements) parts.push(`${c.fabricMovements} fabric movements`);
        if (c.accessoryMovements) parts.push(`${c.accessoryMovements} acc. movements`);
        showToast(
          parts.length > 0 ? `Imported: ${parts.join(", ")}` : "Import complete. All records already exist.",
          "success"
        );
      } catch (err: any) {
        if (err instanceof SyntaxError) {
          showToast("Invalid JSON file. Please select a valid backup file.", "error");
        } else {
          showToast(err.message || "Failed to import backup", "error");
        }
      } finally {
        setImportingBackup(false);
      }
    };
    input.click();
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast("All password fields are required", "error");
      return;
    }
    if (newPassword.length < 6) {
      showToast("New password must be at least 6 characters", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast("New password and confirm password do not match", "error");
      return;
    }

    setChangingPassword(true);
    try {
      await apiPost("/auth/change-password", { currentPassword, newPassword });
      showToast("Password changed successfully", "success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      showToast(err.message || "Failed to change password", "error");
    } finally {
      setChangingPassword(false);
    }
  };

  const fetchPurposes = useCallback(async () => {
    try {
      const data = await apiGet("/purposes");
      setPurposes(data.purposes || []);
    } catch (err: any) {
      showToast(err.message || "Failed to load purposes", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPurposes();
  }, [fetchPurposes]);

  const handleAdd = async () => {
    const name = newPurpose.trim();
    if (!name) return;

    setAdding(true);
    try {
      await apiPost("/purposes", { name });
      showToast("Purpose added successfully", "success");
      setNewPurpose("");
      await fetchPurposes();
    } catch (err: any) {
      showToast(err.message || "Failed to add purpose", "error");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await apiDelete(`/purposes/${id}`);
      showToast("Purpose deleted", "success");
      setPurposes((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      showToast(err.message || "Failed to delete purpose", "error");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your system settings</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-primary" />
              <CardTitle>Stock Purposes</CardTitle>
            </div>
            <CardDescription>
              Add custom purposes for stock in/out operations (e.g. Shopify, Sample, Laam)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {canPerformAction("create") && (
              <div className="flex gap-2">
                <Input
                  placeholder="Enter purpose name..."
                  value={newPurpose}
                  onChange={(e) => setNewPurpose(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                  disabled={adding}
                />
                <Button onClick={handleAdd} disabled={adding || !newPurpose.trim()}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              </div>
            )}

            {loading ? (
              <p className="text-sm text-muted-foreground">Loading purposes...</p>
            ) : purposes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No purposes added yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {purposes.map((purpose) => (
                  <Badge
                    key={purpose.id}
                    variant="secondary"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm"
                  >
                    {purpose.name}
                    {canPerformAction("delete") && (
                      <button
                        onClick={() => handleDelete(purpose.id)}
                        className="ml-1 rounded-full hover:bg-destructive/20 p-0.5 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </button>
                    )}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              <CardTitle>Change Password</CardTitle>
            </div>
            <CardDescription>
              Update your account password
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Current Password</label>
              <Input
                type="password"
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={changingPassword}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">New Password</label>
              <Input
                type="password"
                placeholder="Enter new password (min 6 characters)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={changingPassword}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Confirm New Password</label>
              <Input
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleChangePassword()}
                disabled={changingPassword}
              />
            </div>
            <Button
              onClick={handleChangePassword}
              disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
            >
              {changingPassword ? "Changing..." : "Change Password"}
            </Button>
          </CardContent>
        </Card>
        {isAdmin() && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                <CardTitle>Data Backup</CardTitle>
              </div>
              <CardDescription>
                Full system backup including all data and images
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Download className="w-5 h-5 text-blue-500" />
                    <h3 className="font-semibold">Export Backup</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Downloads a complete backup file with all your data and images.
                  </p>
                  <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                    <Badge variant="secondary" className="text-xs">Articles</Badge>
                    <Badge variant="secondary" className="text-xs">Variants</Badge>
                    <Badge variant="secondary" className="text-xs">Fabric</Badge>
                    <Badge variant="secondary" className="text-xs">Accessories</Badge>
                    <Badge variant="secondary" className="text-xs">Purposes</Badge>
                    <Badge variant="secondary" className="text-xs">Stock History</Badge>
                    <Badge variant="secondary" className="text-xs flex items-center gap-1"><Image className="w-3 h-3" />Images</Badge>
                  </div>
                  <Button
                    onClick={handleDownloadBackup}
                    disabled={downloadingBackup}
                    className="gap-2 w-full"
                  >
                    {downloadingBackup ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    {downloadingBackup ? "Preparing backup..." : "Download Backup"}
                  </Button>
                </div>

                <div className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Upload className="w-5 h-5 text-green-500" />
                    <h3 className="font-semibold">Import Backup</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Restore data from a backup file. Existing records are skipped (no duplicates).
                  </p>
                  <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded-md p-2">
                    <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>Images from backup will be restored automatically if included in the file.</span>
                  </div>
                  <Button
                    onClick={handleImportBackup}
                    disabled={importingBackup}
                    variant="outline"
                    className="gap-2 w-full"
                  >
                    {importingBackup ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    {importingBackup ? "Importing..." : "Import Backup File"}
                  </Button>
                </div>
              </div>

              {lastImportResult && (
                <div className="border rounded-lg p-4 bg-green-50 dark:bg-green-950/20 space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <h3 className="font-semibold text-green-700 dark:text-green-400">Import Complete</h3>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                    {lastImportResult.articles > 0 && (
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>{lastImportResult.articles} Articles</span>
                      </div>
                    )}
                    {lastImportResult.variants > 0 && (
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>{lastImportResult.variants} Variants</span>
                      </div>
                    )}
                    {lastImportResult.fabrics > 0 && (
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>{lastImportResult.fabrics} Fabrics</span>
                      </div>
                    )}
                    {lastImportResult.accessories > 0 && (
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>{lastImportResult.accessories} Accessories</span>
                      </div>
                    )}
                    {lastImportResult.purposes > 0 && (
                      <div className="flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>{lastImportResult.purposes} Purposes</span>
                      </div>
                    )}
                    {lastImportResult.images > 0 && (
                      <div className="flex items-center gap-1.5">
                        <Image className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>{lastImportResult.images} Images</span>
                      </div>
                    )}
                    {lastImportResult.imageFiles > 0 && (
                      <div className="flex items-center gap-1.5">
                        <Image className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>{lastImportResult.imageFiles} Image Files</span>
                      </div>
                    )}
                    {lastImportResult.stockMovements > 0 && (
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>{lastImportResult.stockMovements} Stock Movements</span>
                      </div>
                    )}
                    {lastImportResult.fabricMovements > 0 && (
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>{lastImportResult.fabricMovements} Fabric Movements</span>
                      </div>
                    )}
                    {lastImportResult.accessoryMovements > 0 && (
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>{lastImportResult.accessoryMovements} Acc. Movements</span>
                      </div>
                    )}
                    {lastImportResult.skipped > 0 && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>{lastImportResult.skipped} Skipped</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
