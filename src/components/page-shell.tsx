"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { DashboardLayout } from "./dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2, Pencil, Trash2 } from "lucide-react";
import { FilterPanel, type FilterField } from "@/components/filter-panel";
import { Pagination } from "@/components/ui/pagination";
import { apiGet } from "@/lib/api";

interface Column {
  label: string;
  key: string;
  render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode;
  hideOnMobile?: boolean;
}

interface PageShellProps {
  title: string;
  description: string;
  columns: Column[];
  endpoint: string;
  dataKey: string;
  statusKey?: string;
  searchPlaceholder?: string;
  filterFields?: FilterField[];
  pageSize?: number;
  mapRow?: (item: Record<string, unknown>) => Record<string, unknown>;
  rawData?: Record<string, unknown>[];
  onAdd?: () => void;
  onEdit?: (row: Record<string, unknown>) => void;
  onDelete?: (row: Record<string, unknown>) => void;
  addLabel?: string;
  extraActions?: (row: Record<string, unknown>) => React.ReactNode;
  headerActions?: React.ReactNode;
  children?: React.ReactNode;
  refreshTrigger?: number;
}

function getStatusVariant(status: string) {
  switch (status) {
    case "Active": case "active": case "completed": return "success" as const;
    case "Draft": case "draft": case "pending": return "secondary" as const;
    case "Review": case "review": case "in_progress": return "warning" as const;
    case "Discontinued": case "cancelled": return "destructive" as const;
    default: return "outline" as const;
  }
}

export function PageShell({
  title,
  description,
  columns,
  endpoint,
  dataKey,
  statusKey,
  searchPlaceholder,
  filterFields = [],
  pageSize = 15,
  mapRow,
  rawData,
  onAdd,
  onEdit,
  onDelete,
  addLabel,
  extraActions,
  headerActions,
  children,
  refreshTrigger,
}: PageShellProps) {
  const [allData, setAllData] = useState<Record<string, unknown>[]>([]);
  const [allRaw, setAllRaw] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const buildQueryString = useCallback(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    Object.entries(filterValues).forEach(([key, val]) => {
      if (val) params.set(key, val);
    });
    const qs = params.toString();
    return qs ? `${endpoint}?${qs}` : endpoint;
  }, [endpoint, search, filterValues]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const url = buildQueryString();
      const result = await apiGet(url);
      const items = result[dataKey] || [];
      setAllRaw(items);
      const mapped = mapRow ? items.map(mapRow) : items;
      setAllData(mapped);
      setCurrentPage(1);
    } catch {
      setAllData([]);
      setAllRaw([]);
    } finally {
      setLoading(false);
    }
  }, [buildQueryString, dataKey, mapRow, refreshKey, refreshTrigger]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchData();
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [fetchData]);

  useEffect(() => {
    if (rawData) {
      setAllRaw(rawData);
    }
  }, [rawData]);

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const totalItems = allData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const paginatedData = allData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );
  const startIndex = (currentPage - 1) * pageSize;

  const hasActiveFilters =
    search.trim().length > 0 ||
    Object.values(filterValues).some(Boolean);

  const handleClearAll = () => {
    setSearch("");
    setFilterValues({});
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  };

  const hasRowActions = onEdit || onDelete || extraActions;
  const mobileColumns = columns.filter(c => !c.hideOnMobile);

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">{title}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {!loading && (
              <span className="text-xs sm:text-sm text-muted-foreground">
                {totalItems} {totalItems === 1 ? "record" : "records"}
              </span>
            )}
            {headerActions}
            {onAdd && (
              <Button className="gap-2 cursor-pointer text-sm" onClick={onAdd} size="sm">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">{addLabel || "Add New"}</span>
                <span className="sm:hidden">Add</span>
              </Button>
            )}
          </div>
        </div>

        <Card>
          <CardHeader className="p-3 sm:p-6">
            <FilterPanel
              searchPlaceholder={searchPlaceholder || `Search ${title.toLowerCase()}...`}
              searchValue={search}
              onSearchChange={setSearch}
              filters={filterFields}
              filterValues={filterValues}
              onFilterChange={handleFilterChange}
              onClearAll={handleClearAll}
              hasActiveFilters={hasActiveFilters}
            />
          </CardHeader>
          <CardContent className="p-0 sm:p-6 sm:pt-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Loading...</span>
              </div>
            ) : paginatedData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <p className="text-muted-foreground">No {title.toLowerCase()} found.</p>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 cursor-pointer"
                    onClick={handleClearAll}
                  >
                    Clear filters
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        {columns.map((col) => (
                          <th
                            key={col.key}
                            className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider"
                          >
                            {col.label}
                          </th>
                        ))}
                        {hasRowActions && (
                          <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider w-24">
                            Actions
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedData.map((row, i) => {
                        const rawIndex = startIndex + i;
                        const raw = allRaw[rawIndex] || row;
                        return (
                          <tr
                            key={i}
                            className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors"
                          >
                            {columns.map((col) => (
                              <td key={col.key} className="py-3 px-4 text-sm">
                                {col.render ? (
                                  col.render(row[col.key], row)
                                ) : statusKey && col.key === statusKey ? (
                                  <Badge variant={getStatusVariant(String(row[col.key]))}>
                                    {String(row[col.key])}
                                  </Badge>
                                ) : col.key === "id" ? (
                                  <span className="font-mono text-muted-foreground">
                                    {String(row[col.key] ?? "")}
                                  </span>
                                ) : (
                                  <span
                                    className={
                                      col.key === "name"
                                        ? "font-medium"
                                        : "text-muted-foreground"
                                    }
                                  >
                                    {String(row[col.key] ?? "")}
                                  </span>
                                )}
                              </td>
                            ))}
                            {hasRowActions && (
                              <td className="py-3 px-4 text-sm text-right">
                                <div className="flex items-center justify-end gap-1">
                                  {extraActions && extraActions(raw)}
                                  {onEdit && (
                                    <button
                                      onClick={() => onEdit(raw)}
                                      className="p-1.5 rounded-md hover:bg-accent transition-colors cursor-pointer"
                                      title="Edit"
                                    >
                                      <Pencil className="w-4 h-4 text-muted-foreground" />
                                    </button>
                                  )}
                                  {onDelete && (
                                    <button
                                      onClick={() => onDelete(raw)}
                                      className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors cursor-pointer"
                                      title="Delete"
                                    >
                                      <Trash2 className="w-4 h-4 text-destructive" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="sm:hidden divide-y divide-border">
                  {paginatedData.map((row, i) => {
                    const rawIndex = startIndex + i;
                    const raw = allRaw[rawIndex] || row;
                    const primaryCol = mobileColumns[0];
                    const secondaryCol = mobileColumns[1];
                    const restCols = mobileColumns.slice(2);

                    return (
                      <div key={i} className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-sm">
                              {primaryCol?.render
                                ? primaryCol.render(row[primaryCol.key], row)
                                : String(row[primaryCol?.key] ?? "")}
                            </div>
                            {secondaryCol && (
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {statusKey && secondaryCol.key === statusKey ? (
                                  <Badge variant={getStatusVariant(String(row[secondaryCol.key]))} className="text-[10px]">
                                    {String(row[secondaryCol.key])}
                                  </Badge>
                                ) : secondaryCol.render ? (
                                  secondaryCol.render(row[secondaryCol.key], row)
                                ) : (
                                  String(row[secondaryCol.key] ?? "")
                                )}
                              </div>
                            )}
                          </div>
                          {hasRowActions && (
                            <div className="flex items-center gap-1 shrink-0">
                              {extraActions && extraActions(raw)}
                              {onEdit && (
                                <button
                                  onClick={() => onEdit(raw)}
                                  className="p-2 rounded-md hover:bg-accent transition-colors cursor-pointer"
                                >
                                  <Pencil className="w-4 h-4 text-muted-foreground" />
                                </button>
                              )}
                              {onDelete && (
                                <button
                                  onClick={() => onDelete(raw)}
                                  className="p-2 rounded-md hover:bg-destructive/10 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                        {restCols.length > 0 && (
                          <div className="flex flex-wrap gap-x-4 gap-y-1">
                            {restCols.map((col) => (
                              <div key={col.key} className="text-xs">
                                <span className="text-muted-foreground">{col.label}: </span>
                                {col.render ? (
                                  <span>{col.render(row[col.key], row)}</span>
                                ) : statusKey && col.key === statusKey ? (
                                  <Badge variant={getStatusVariant(String(row[col.key]))} className="text-[10px]">
                                    {String(row[col.key])}
                                  </Badge>
                                ) : (
                                  <span className="font-medium">{String(row[col.key] ?? "")}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="p-3 sm:p-0 sm:pt-0">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={totalItems}
                    pageSize={pageSize}
                    onPageChange={setCurrentPage}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {children}
      </div>
    </DashboardLayout>
  );
}

export { type Column };
export type RefreshFn = () => void;
