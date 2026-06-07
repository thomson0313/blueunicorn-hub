"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { SEARCH_TYPE_LABELS, type SearchResult, type SearchResultType } from "@/lib/dashboard-search";

const TYPE_ORDER: SearchResultType[] = ["project", "member", "field", "alert"];

function groupResults(results: SearchResult[]): Map<SearchResultType, SearchResult[]> {
  const map = new Map<SearchResultType, SearchResult[]>();
  for (const r of results) {
    const list = map.get(r.type) ?? [];
    list.push(r);
    map.set(r.type, list);
  }
  return map;
}

export function DashboardSearch({ isAdmin }: { isAdmin: boolean }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard/search?q=${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      setResults(data.results ?? []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(() => void runSearch(query), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, runSearch]);

  useEffect(() => {
    if (!open) return;
    function onOutside(e: MouseEvent) {
      if (rootRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open]);

  const grouped = groupResults(results);
  const hasResults = results.length > 0;
  const showPanel = open && query.trim().length >= 2;

  return (
    <div ref={rootRef} className="relative">
      <label className="sr-only" htmlFor="dashboard-search">
        {isAdmin ? "Search projects, members, fields, and alerts" : "Search projects"}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </span>
        <input
          id="dashboard-search"
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={
            isAdmin
              ? "Search projects, members, fields, alerts…"
              : "Search your projects…"
          }
          className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
          autoComplete="off"
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-brand-100 border-t-brand-500 animate-spin" />
        )}
      </div>

      {showPanel && (
        <div className="absolute z-50 mt-2 w-full max-h-[min(24rem,70vh)] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
          {!loading && !hasResults && (
            <p className="px-4 py-6 text-sm text-slate-500 text-center">No results for &ldquo;{query.trim()}&rdquo;</p>
          )}
          {hasResults && (
            <div className="py-2">
              {TYPE_ORDER.map((type) => {
                const items = grouped.get(type);
                if (!items?.length) return null;
                return (
                  <div key={type}>
                    <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      {SEARCH_TYPE_LABELS[type]}
                    </p>
                    <ul>
                      {items.map((item) => (
                        <li key={`${item.type}-${item.id}`}>
                          <Link
                            href={item.href}
                            onClick={() => {
                              setOpen(false);
                              setQuery("");
                            }}
                            className="block px-4 py-2.5 hover:bg-slate-50 transition"
                          >
                            <span className="text-sm font-medium text-slate-800">{item.title}</span>
                            {item.subtitle && (
                              <span className="block text-xs text-slate-500 mt-0.5 truncate">{item.subtitle}</span>
                            )}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
