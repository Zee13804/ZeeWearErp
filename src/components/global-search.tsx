"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, X, FileText, Layers, Scissors, Gem } from "lucide-react";
import { apiGet } from "@/lib/api";

interface SearchResult {
  type: string;
  id: number;
  title: string;
  subtitle: string;
  href: string;
}

const typeConfig: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  article: { icon: FileText, label: "Article", color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
  variant: { icon: Layers, label: "Variant", color: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300" },
  fabric: { icon: Scissors, label: "Fabric", color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" },
  accessory: { icon: Gem, label: "Accessory", color: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" },
};

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const debounceRef = useRef<NodeJS.Timeout>(undefined);

  const doSearch = useCallback(async (term: string) => {
    if (term.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const data = await apiGet(`/search?q=${encodeURIComponent(term)}`);
      setResults(data.results || []);
      setSelectedIndex(-1);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, doSearch]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === "Escape") {
        setOpen(false);
        setQuery("");
        setResults([]);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
        setResults([]);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const navigate = (href: string) => {
    setOpen(false);
    setQuery("");
    setResults([]);
    router.push(href);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && selectedIndex >= 0 && results[selectedIndex]) {
      navigate(results[selectedIndex].href);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50); }}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-background hover:bg-accent text-muted-foreground text-sm transition-colors w-full max-w-md cursor-pointer"
      >
        <Search className="w-4 h-4 shrink-0" />
        <span className="flex-1 text-left">Search everything...</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono bg-muted rounded border border-border">
          ⌘K
        </kbd>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[15vh] bg-black/40">
      <div ref={containerRef} className="w-full max-w-lg mx-4 bg-card rounded-xl border border-border shadow-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <Search className="w-5 h-5 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search articles, variants, fabric, accessories..."
            className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground outline-none text-sm"
            autoFocus
          />
          {query && (
            <button onClick={() => { setQuery(""); setResults([]); }} className="p-1 hover:bg-muted rounded cursor-pointer">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
          <button onClick={() => { setOpen(false); setQuery(""); setResults([]); }} className="p-1 hover:bg-muted rounded cursor-pointer">
            <kbd className="text-[10px] font-mono text-muted-foreground px-1.5 py-0.5 bg-muted rounded border border-border">ESC</kbd>
          </button>
        </div>

        <div className="max-h-[50vh] overflow-y-auto">
          {loading && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">Searching...</div>
          )}

          {!loading && query.length >= 2 && results.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">No results found for &quot;{query}&quot;</div>
          )}

          {!loading && query.length < 2 && query.length > 0 && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">Type at least 2 characters to search</div>
          )}

          {!loading && query.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              <p>Search across articles, variants, fabric, accessories, and production orders</p>
              <p className="mt-1 text-xs">Use arrow keys to navigate, Enter to select</p>
            </div>
          )}

          {!loading && results.length > 0 && (
            <ul className="py-2">
              {results.map((result, i) => {
                const config = typeConfig[result.type] || typeConfig.article;
                const Icon = config.icon;
                return (
                  <li key={`${result.type}-${result.id}`}>
                    <button
                      onClick={() => navigate(result.href)}
                      onMouseEnter={() => setSelectedIndex(i)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors cursor-pointer ${
                        selectedIndex === i ? "bg-accent" : "hover:bg-accent/50"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${config.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">{result.title}</div>
                        <div className="text-xs text-muted-foreground truncate">{result.subtitle}</div>
                      </div>
                      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider shrink-0">
                        {config.label}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
