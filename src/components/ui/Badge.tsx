type Variant =
  | "accent"
  | "gray"
  | "green"
  | "red"
  | "amber"
  | "blue"
  | "purple"
  | "cyan"
  | "orange";

const variantClasses: Record<Variant, string> = {
  accent: "bg-teal-500/15 text-teal-400",
  gray: "bg-slate-500/15 text-slate-400",
  green: "bg-emerald-500/15 text-emerald-400",
  red: "bg-rose-500/15 text-rose-400",
  amber: "bg-amber-500/15 text-amber-400",
  blue: "bg-blue-500/15 text-blue-400",
  purple: "bg-violet-500/15 text-violet-400",
  cyan: "bg-cyan-500/15 text-cyan-400",
  orange: "bg-orange-500/15 text-orange-400",
};

interface BadgeProps {
  variant?: Variant;
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = "gray", children, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
