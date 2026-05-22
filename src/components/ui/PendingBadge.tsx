export function PendingBadge() {
  return (
    <span
      title="Staged — not yet committed"
      className="inline-flex items-center gap-1 text-[10px] font-medium bg-amber-900/30 text-amber-300 border border-amber-700/30 px-1.5 py-0.5 rounded-full whitespace-nowrap"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
      Pending
    </span>
  );
}
