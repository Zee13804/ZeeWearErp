"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, type SelectOption } from "@/components/ui/select";
import { Search, Filter, X, Calendar } from "lucide-react";

export interface FilterField {
  key: string;
  label: string;
  type: "select" | "date" | "text";
  options?: SelectOption[];
  placeholder?: string;
}

interface FilterPanelProps {
  searchPlaceholder: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  filters: FilterField[];
  filterValues: Record<string, string>;
  onFilterChange: (key: string, value: string) => void;
  onClearAll: () => void;
  hasActiveFilters: boolean;
}

export function FilterPanel({
  searchPlaceholder,
  searchValue,
  onSearchChange,
  filters,
  filterValues,
  onFilterChange,
  onClearAll,
  hasActiveFilters,
}: FilterPanelProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            className="pl-9 text-sm"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 cursor-pointer"
            onClick={() => setExpanded(!expanded)}
          >
            <Filter className="w-4 h-4" />
            <span className="hidden sm:inline">Filters</span>
            {hasActiveFilters && (
              <span className="ml-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                {Object.values(filterValues).filter(Boolean).length}
              </span>
            )}
          </Button>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-muted-foreground cursor-pointer"
              onClick={onClearAll}
            >
              <X className="w-3 h-3" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 p-3 sm:p-4 bg-muted/30 rounded-lg border border-border">
          {filters.map((f) => (
            <div key={f.key} className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {f.label}
              </label>
              {f.type === "select" && f.options ? (
                <Select
                  options={f.options}
                  placeholder={`All ${f.label}`}
                  value={filterValues[f.key] || ""}
                  onChange={(val) => onFilterChange(f.key, val)}
                />
              ) : f.type === "text" ? (
                <Input
                  placeholder={f.placeholder || `Filter by ${f.label.toLowerCase()}...`}
                  value={filterValues[f.key] || ""}
                  onChange={(e) => onFilterChange(f.key, e.target.value)}
                />
              ) : f.type === "date" ? (
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    type="date"
                    className="pl-9"
                    value={filterValues[f.key] || ""}
                    onChange={(e) => onFilterChange(f.key, e.target.value)}
                  />
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
