"use client";

import { useEffect, useRef, useState } from "react";

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "—",
  searchPlaceholder = "Search…",
}: {
  options: { id: string; name: string }[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = query
    ? options.filter((o) =>
        `${o.name} ${o.id}`.toLowerCase().includes(query.toLowerCase())
      )
    : options;

  const selected = options.find((o) => o.id === value);

  return (
    <div ref={ref} className="relative inline-block min-w-[220px]">
      <button
        type="button"
        onClick={() => { setOpen((v) => !v); setQuery(""); }}
        className="w-full flex items-center justify-between gap-2 bg-row border border-border rounded-md px-2 py-1.5 text-sm text-primary focus:outline-none focus:border-accent transition-colors"
      >
        <span className="truncate">{selected ? `${selected.name} (${selected.id})` : placeholder}</span>
        <svg className="w-3.5 h-3.5 flex-shrink-0 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[260px] bg-card border border-border rounded-md shadow-lg">
          <div className="p-1.5 border-b border-border">
            <input
              autoFocus
              type="text"
              placeholder={searchPlaceholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-row border border-border rounded px-2 py-1 text-sm text-primary placeholder:text-muted focus:outline-none focus:border-accent"
            />
          </div>
          <ul className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-muted">No results</li>
            ) : (
              filtered.map((o) => (
                <li
                  key={o.id}
                  onClick={() => { onChange(o.id); setOpen(false); }}
                  className={`flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer transition-colors ${
                    o.id === value
                      ? "bg-accent/10 text-accent"
                      : "text-primary hover:bg-row"
                  }`}
                >
                  {o.id === value && (
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  <span className={o.id === value ? "" : "pl-5"}>{o.name} ({o.id})</span>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
