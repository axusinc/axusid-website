"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { focusRing, insetSurface, roundedRect } from "@/lib/design";
import { cn } from "@/lib/utils";

type CopyFieldProps = {
  label?: string;
  value: string;
  className?: string;
};

export function CopyField({ label, value, className }: CopyFieldProps) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    if (status === "idle") return;
    const timer = setTimeout(() => setStatus("idle"), 2000);
    return () => clearTimeout(timer);
  }, [status]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
  };

  return (
    <div className={cn("min-w-0", className)}>
      {label ? <p className="mb-1.5 text-[13px] font-medium text-neutral-600">{label}</p> : null}
      <div className={cn("flex min-w-0 items-center gap-2 py-1.5 pl-3.5 pr-1.5", insetSurface, roundedRect)}>
        <code className="min-w-0 flex-1 select-all truncate font-mono text-[13px] text-neutral-900" title={value}>
          {value}
        </code>
        <button
          type="button"
          onClick={copy}
          className={cn(
            "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors",
            focusRing,
            status === "copied"
              ? "text-emerald-700"
              : status === "failed"
                ? "text-red-600"
                : "text-neutral-500 hover:bg-black/[0.05] hover:text-neutral-900",
          )}
          aria-label={label ? `Copy ${label}` : "Copy to clipboard"}
        >
          {status === "copied" ? (
            <Check aria-hidden className="h-3.5 w-3.5" strokeWidth={2.5} />
          ) : (
            <Copy aria-hidden className="h-3.5 w-3.5" />
          )}
          <span aria-live="polite">
            {status === "copied" ? "Copied" : status === "failed" ? "Select to copy" : "Copy"}
          </span>
        </button>
      </div>
    </div>
  );
}
