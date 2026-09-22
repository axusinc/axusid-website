import { cn } from "@/lib/utils";

type LastUsedBadgeProps = {
  className?: string;
  label?: string;
  variant?: "end" | "inline" | "floating";
};

export function LastUsedBadge({
  className,
  label = "Last Used",
  variant = "end",
}: LastUsedBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 select-none items-center rounded-full bg-[#0059ed] px-2 py-0.5 text-[11px] font-medium leading-none text-white shadow-xs pointer-events-none",
        variant === "end" && "absolute right-3.5 top-1/2 -translate-y-1/2",
        variant === "floating" && "absolute -top-2.5 right-3 z-10 shadow-[0_1px_2px_rgba(0,0,0,0.08)]",
        className,
      )}
      aria-hidden="true"
    >
      {label}
    </span>
  );
}
