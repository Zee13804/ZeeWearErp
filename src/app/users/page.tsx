"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";
import { isAdmin, isDev } from "@/lib/auth";
import { useToast } from "@/components/ui/toast";
import { Loader2, UserPlus, Trash2, Shield, Eye, ShoppingBag } from "lucide-react";

interface User {
  id?: string;
  _id?: string;
  email: string;
  role: string;
}

interface PermissionSchema {
  pages: { key: string; label: string }[];
  actions: { key: string; label: string }[];
}

function getRoleBadgeVariant(role: string) {
  switch (role) {
    case "admin": return "default" as const;
    case "dev": return "default" as const;
    case "viewer": return "outline" as const;
    default: return "secondary" as const;
  }
}

export default function UsersPage() {
  const router = useRouter();
  const { success, error: showError } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [devMode, setDevMode] = useState(false);
  const [activeTab, setActiveTab] = useState<"users" | "permissions">("users");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("store");
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState("");
  const [updating, setUpdating] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [permSchema, setPermSchema] = useState<PermissionSchema | null>(null);
  const [storePerms, setStorePerms] = useState<Record<string, boolean>>({});
  const [viewerPerms, setViewerPerms] = useState<Record<string, boolean>>({});
  const [savingPerms, setSavingPerms] = useState(false);
  const [permRole, setPermRole] = useState<"store" | "viewer">("store");

  useEffect(() => {
    if (!isAdmin()) {
      router.replace("/dashboard");
      return;
    }
    const dev = isDev();
    setDevMode(dev);
    fetchUsers();
    if (dev) {
      fetchPermissions();
    }
  }, [router]);

  async function fetchUsers() {
    try {
      setLoading(true);
      const data = await apiGet("/users");
      const list = Array.isArray(data) ? data : data?.users ?? data?.data ?? [];
      setUsers(list);
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : "Failed to load users.");
    } finally {
      setLoading(false);
    }
  }

  async function fetchPermissions() {
    try {
      const data = await apiGet("/permissions");
      setPermSchema(data.schema);
      setStorePerms(data.permissions?.store || {});
      setViewerPerms(data.permissions?.viewer || {});
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : "Failed to load permissions.");
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      await apiPost("/users", { email, password, role });
      success("User created successfully.");
      setEmail("");
      setPassword("");
      setRole("store");
      fetchUsers();
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : "Failed to create user.");
    } finally {
      setCreating(false);
    }
  }

  async function handleUpdateRole(userId: string) {
    setUpdating(true);
    try {
      await apiPut(`/users/${userId}`, { role: editRole });
      success("User role updated successfully.");
      setEditingId(null);
      fetchUsers();
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : "Failed to update role.");
    } finally {
      setUpdating(false);
    }
  }

  async function handleDelete(userId: string) {
    if (!confirm("Are you sure you want to delete this user?")) return;
    setDeletingId(userId);
    try {
      await apiDelete(`/users/${userId}`);
      success("User deleted successfully.");
      fetchUsers();
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : "Failed to delete user.");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleSavePermissions() {
    setSavingPerms(true);
    try {
      const perms = permRole === "store" ? storePerms : viewerPerms;
      await apiPut("/permissions", { role: permRole, permissions: perms });
      success(`${permRole === "store" ? "Store" : "Viewer"} permissions updated.`);
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : "Failed to save permissions.");
    } finally {
      setSavingPerms(false);
    }
  }

  function togglePerm(key: string) {
    if (permRole === "store") {
      setStorePerms((prev) => ({ ...prev, [key]: !prev[key] }));
    } else {
      setViewerPerms((prev) => ({ ...prev, [key]: !prev[key] }));
    }
  }

  function getUserId(user: User): string {
    return user.id || user._id || user.email;
  }

  const currentPerms = permRole === "store" ? storePerms : viewerPerms;

  if (!isAdmin()) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">User Management</h1>
          <p className="text-muted-foreground mt-1">
            {devMode ? "Manage users, roles, and permissions." : "View system users."}
          </p>
        </div>

        {devMode && (
          <div className="flex gap-2 border-b border-border">
            <button
              onClick={() => setActiveTab("users")}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                activeTab === "users"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Users
            </button>
            <button
              onClick={() => setActiveTab("permissions")}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                activeTab === "permissions"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Permissions
              </span>
            </button>
          </div>
        )}

        {activeTab === "users" && (
          <>
            {devMode && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <UserPlus className="w-5 h-5" />
                    Create New User
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-3">
                    <Input
                      type="email"
                      placeholder="Email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="flex-1"
                    />
                    <Input
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="flex-1"
                    />
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="h-10 rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="store">Store</option>
                      <option value="viewer">Viewer</option>
                      <option value="admin">Admin</option>
                    </select>
                    <Button type="submit" disabled={creating} className="gap-2 cursor-pointer">
                      {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                      {creating ? "Creating..." : "Create"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>All Users</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : users.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No users found.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</th>
                          <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Role</th>
                          {devMode && <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((user) => {
                          const uid = getUserId(user);
                          const isEditing = editingId === uid;
                          return (
                            <tr key={uid} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                              <td className="py-3 px-4 text-sm font-medium">{user.email}</td>
                              <td className="py-3 px-4">
                                {isEditing ? (
                                  <select
                                    value={editRole}
                                    onChange={(e) => setEditRole(e.target.value)}
                                    className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                                  >
                                    <option value="store">Store</option>
                                    <option value="viewer">Viewer</option>
                                    <option value="admin">Admin</option>
                                  </select>
                                ) : (
                                  <Badge variant={getRoleBadgeVariant(user.role)}>{user.role}</Badge>
                                )}
                              </td>
                              {devMode && (
                                <td className="py-3 px-4">
                                  {user.role === "dev" ? (
                                    <span className="text-xs text-muted-foreground">System Account</span>
                                  ) : isEditing ? (
                                    <div className="flex gap-2">
                                      <Button size="sm" onClick={() => handleUpdateRole(uid)} disabled={updating} className="cursor-pointer">
                                        {updating ? "Saving..." : "Save"}
                                      </Button>
                                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="cursor-pointer">
                                        Cancel
                                      </Button>
                                    </div>
                                  ) : (
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => { setEditingId(uid); setEditRole(user.role); }}
                                        className="cursor-pointer"
                                      >
                                        Edit Role
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleDelete(uid)}
                                        disabled={deletingId === uid}
                                        className="cursor-pointer text-destructive hover:text-destructive"
                                      >
                                        {deletingId === uid ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                      </Button>
                                    </div>
                                  )}
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {activeTab === "permissions" && devMode && permSchema && (
          <div className="space-y-6">
            <div className="flex gap-3">
              <button
                onClick={() => setPermRole("store")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  permRole === "store"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                <ShoppingBag className="w-4 h-4" />
                Store Role
              </button>
              <button
                onClick={() => setPermRole("viewer")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  permRole === "viewer"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                <Eye className="w-4 h-4" />
                Viewer Role
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Page Access</CardTitle>
                  <p className="text-xs text-muted-foreground">Which pages this role can see</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {permSchema.pages.map((p) => (
                    <label key={p.key} className="flex items-center justify-between cursor-pointer group">
                      <span className="text-sm text-foreground">{p.label}</span>
                      <button
                        type="button"
                        onClick={() => togglePerm(p.key)}
                        className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${
                          currentPerms[p.key] ? "bg-primary" : "bg-muted-foreground/30"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                            currentPerms[p.key] ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </label>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Action Permissions</CardTitle>
                  <p className="text-xs text-muted-foreground">What actions this role can perform</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {permSchema.actions.map((p) => (
                    <label key={p.key} className="flex items-center justify-between cursor-pointer group">
                      <span className="text-sm text-foreground">{p.label}</span>
                      <button
                        type="button"
                        onClick={() => togglePerm(p.key)}
                        className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${
                          currentPerms[p.key] ? "bg-primary" : "bg-muted-foreground/30"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                            currentPerms[p.key] ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </label>
                  ))}
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSavePermissions} disabled={savingPerms} className="gap-2 cursor-pointer">
                {savingPerms ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                {savingPerms ? "Saving..." : "Save Permissions"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
