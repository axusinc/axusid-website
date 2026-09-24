"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { focusRing } from "@/lib/design";
import { cn } from "@/lib/utils";

export function CodeBlock({
  code,
  label,
  wrap = false,
}: {
  code: string;
  label?: string;
  wrap?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopyFailed(false);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyFailed(true);
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-black/[0.07] bg-neutral-950">
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-2">
        <span className="truncate font-mono text-xs text-neutral-400">
          {label ?? "Copy and paste"}
        </span>
        <button
          type="button"
          onClick={copy}
          className={cn(
            "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-lg px-2 text-xs font-medium transition-colors",
            focusRing,
            copied
              ? "text-emerald-400"
              : "text-neutral-400 hover:bg-white/10 hover:text-white",
          )}
          aria-label={label ? `Copy ${label}` : "Copy code to clipboard"}
        >
          {copied ? (
            <Check aria-hidden className="h-3.5 w-3.5" strokeWidth={2.5} />
          ) : (
            <Copy aria-hidden className="h-3.5 w-3.5" />
          )}
          <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      {copyFailed && (
        <p role="status" className="px-4 pt-3 text-xs text-amber-200">
          Clipboard unavailable. Select the text below and copy it manually.
        </p>
      )}
      <pre
        tabIndex={0}
        aria-label={label ?? "Code example"}
        className={cn(
          "overflow-x-auto p-4 font-mono text-[13px] leading-relaxed text-neutral-100",
          wrap && "max-h-[420px] whitespace-pre-wrap break-words",
        )}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}
