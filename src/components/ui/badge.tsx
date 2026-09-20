import { cn } from "@/lib/utils";

type BadgeTone = "success" | "neutral" | "warning" | "brand";

const tones: Record<BadgeTone, { badge: string; dot: string }> = {
  success: { badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/15", dot: "bg-emerald-500" },
  neutral: { badge: "bg-neutral-100 text-neutral-600 ring-black/[0.06]", dot: "bg-neutral-400" },
  warning: { badge: "bg-amber-50 text-amber-800 ring-amber-600/20", dot: "bg-amber-500" },
  brand: { badge: "bg-red-50 text-brand ring-brand/15", dot: "bg-brand" },
};

export function Badge({
  tone = "neutral",
  dot = false,
  children,
  className,
}: {
  tone?: BadgeTone;
  dot?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-xs font-medium ring-1 ring-inset",
        tones[tone].badge,
        className,
      )}
    >
      {dot ? <span className={cn("h-1.5 w-1.5 rounded-full", tones[tone].dot)} aria-hidden /> : null}
      {children}
    </span>
  );
}
