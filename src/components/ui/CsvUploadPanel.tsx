"use client";

import { useState, useRef } from "react";

export interface CsvUploadPanelProps {
  title: string;
  columns: string[];
  onUpload: (rows: Record<string, string>[]) => Promise<void>;
}

export function CsvUploadPanel({ title, columns, onUpload }: CsvUploadPanelProps) {
  const [open, setOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState<{ ok: number; errors: string[] } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function parseCsv(text: string): Record<string, string>[] {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return [];
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    return lines
      .slice(1)
      .filter((l) => l.trim())
      .map((line) => {
        const values = line.split(",").map((v) => v.trim());
        return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""]));
      });
  }

  async function processFile(file: File) {
    setStatus(null);
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setStatus({ ok: 0, errors: ["File must be a .csv"] });
      return;
    }
    const text = await file.text();
    const rows = parseCsv(text);
    if (rows.length === 0) {
      setStatus({ ok: 0, errors: ["CSV is empty or has no data rows"] });
      return;
    }
    const headers = Object.keys(rows[0]);
    const missing = columns.filter((c) => !headers.includes(c.toLowerCase()));
    if (missing.length > 0) {
      setStatus({ ok: 0, errors: [`Missing required columns: ${missing.join(", ")}`] });
      return;
    }
    setProcessing(true);
    try {
      await onUpload(rows);
      setStatus({ ok: rows.length, errors: [] });
    } catch (e) {
      setStatus({ ok: 0, errors: [e instanceof Error ? e.message : "Unknown error"] });
    } finally {
      setProcessing(false);
    }
  }

  function downloadTemplate() {
    const csv = columns.join(",") + "\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.toLowerCase().replace(/\s+/g, "-")}-template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mb-4">
      {/* Toggle button */}
      <button
        onClick={() => {
          setOpen((o) => !o);
          setStatus(null);
        }}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
          open
            ? "border-accent/50 text-accent bg-accent/5"
            : "border-border text-muted hover:text-primary hover:border-border/80"
        }`}
      >
        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
        <span>Bulk Upload via CSV</span>
        <svg
          className={`w-3 h-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded panel */}
      {open && (
        <div className="mt-2 bg-card border border-border rounded-xl p-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <p className="font-semibold text-primary text-sm">{title}</p>
              <p className="text-xs text-muted mt-1">
                Columns:{" "}
                {columns.map((c) => (
                  <code key={c} className="bg-row border border-border px-1.5 py-0.5 rounded text-xs font-mono text-muted mx-0.5">
                    {c}
                  </code>
                ))}
              </p>
            </div>
            <button
              onClick={downloadTemplate}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-muted hover:text-primary text-xs whitespace-nowrap transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download Template
            </button>
          </div>

          {/* Dropzone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={async (e) => {
              e.preventDefault();
              setIsDragging(false);
              const file = e.dataTransfer.files[0];
              if (file) await processFile(file);
            }}
            onClick={() => !processing && inputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg py-10 text-center cursor-pointer transition-colors ${
              isDragging ? "border-accent bg-accent/5" : "border-border hover:border-accent/40 hover:bg-row/40"
            } ${processing ? "pointer-events-none opacity-60" : ""}`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) await processFile(file);
                e.target.value = "";
              }}
            />
            {processing ? (
              <p className="text-muted text-sm">Processing…</p>
            ) : (
              <>
                <svg className="w-8 h-8 text-muted-dark mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <p className="text-muted text-sm">Drop CSV here or click to browse</p>
                <p className="text-muted-dark text-xs mt-1">Only .csv files accepted</p>
              </>
            )}
          </div>

          {/* Status feedback */}
          {status && (
            <div
              className={`mt-3 rounded-lg px-3 py-2.5 text-sm ${
                status.errors.length > 0
                  ? "bg-red-900/20 border border-red-800/30 text-red-400"
                  : "bg-green-900/20 border border-green-800/30 text-green-400"
              }`}
            >
              {status.errors.length > 0
                ? status.errors.join(" · ")
                : `✓ ${status.ok} row${status.ok !== 1 ? "s" : ""} staged as pending changes.`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
