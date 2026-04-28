"use client";

import { useState, useRef, useEffect } from "react";

interface InlineEditNumberProps {
  value: number | null;
  onSave: (v: number | null) => void;
  prefix?: string;
  suffix?: string;
  placeholder?: string;
  className?: string;
}

export function InlineEditNumber({
  value,
  onSave,
  prefix,
  suffix,
  placeholder = "—",
  className = "",
}: InlineEditNumberProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  function startEdit() {
    setDraft(value !== null ? String(value) : "");
    setEditing(true);
  }

  function commit() {
    const trimmed = draft.trim();
    if (trimmed === "") {
      onSave(null);
    } else {
      const parsed = parseFloat(trimmed);
      onSave(isNaN(parsed) ? null : parsed);
    }
    setEditing(false);
  }

  function cancel() {
    setEditing(false);
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") cancel();
        }}
        className={`bg-row border border-border focus:border-accent rounded px-2 py-1 text-sm text-primary w-28 outline-none ${className}`}
      />
    );
  }

  const display =
    value !== null
      ? `${prefix ?? ""}${value}${suffix ?? ""}`
      : placeholder;

  return (
    <span
      onClick={startEdit}
      className={`cursor-pointer text-sm text-primary hover:text-accent transition-colors ${className}`}
    >
      {display}
    </span>
  );
}
