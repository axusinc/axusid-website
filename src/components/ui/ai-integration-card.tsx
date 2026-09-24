"use client";

import { ArrowUpRight, Check, ChevronDown, Copy, Sparkles } from "lucide-react";
import { useState } from "react";
import { focusRing } from "@/lib/design";
import { cn } from "@/lib/utils";

const stacks = [
  { id: "nextjs", label: "Next.js", line: "My stack is Next.js App Router — put the login in app/api/auth/axus/login/route.ts and the callback in app/api/auth/axus/callback/route.ts." },
  { id: "react", label: "React", line: "My stack is React (SPA) — build the authorize URL client-side and exchange the code from my existing backend." },
  { id: "html", label: "HTML", line: "My stack is plain HTML + vanilla JS — no framework, no build step." },
  { id: "other", label: "Something else", line: "Ask me which stack I use before writing code." },
] as const;

const covers = [
  "Issuer, discovery, and JWKS URLs — prefilled",
  "PKCE flow with exact params and lifetimes",
  "Token verification and verifier-handling rules",
  "Button mark, label, and sizing spec",
];

/** One-shot prompt + handoff buttons: pick a stack, copy or open prefilled. */
export function AiIntegrationCard({ prompt }: { prompt: string }) {
  const [stackId, setStackId] = useState<(typeof stacks)[number]["id"]>("nextjs");
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const stack = stacks.find((s) => s.id === stackId) ?? stacks[0];
  const fullPrompt = `${prompt}\n\n${stack.line}`;
  const encoded = encodeURIComponent(fullPrompt);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(fullPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable — the prompt is still readable in the preview.
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-black/[0.07] bg-neutral-950 text-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-2.5">
        <span className="inline-flex items-center gap-2 text-[13px] font-medium text-neutral-200">
          <Sparkles aria-hidden className="h-3.5 w-3.5 text-brand" />
          One-shot agent prompt
        </span>
        <div className="flex items-center gap-1.5">
          {[
            { label: "ChatGPT", href: `https://chatgpt.com/?q=${encoded}` },
            { label: "Claude", href: `https://claude.ai/new?q=${encoded}` },
          ].map(({ label, href }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "inline-flex h-7 items-center gap-1 rounded-lg px-2 text-xs font-medium text-neutral-300 transition-colors hover:bg-white/10 hover:text-white",
                focusRing,
              )}
            >
              Open in {label}
              <ArrowUpRight aria-hidden className="h-3 w-3" />
            </a>
          ))}
          <button
            type="button"
            onClick={copy}
            className={cn(
              "inline-flex h-7 items-center gap-1 rounded-lg px-2 text-xs font-medium transition-colors",
              focusRing,
              copied ? "text-emerald-400" : "text-neutral-300 hover:bg-white/10 hover:text-white",
            )}
            aria-label="Copy agent prompt to clipboard"
          >
            {copied ? (
              <Check aria-hidden className="h-3 w-3" strokeWidth={2.5} />
            ) : (
              <Copy aria-hidden className="h-3 w-3" />
            )}
            <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
          </button>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div>
          <p className="text-xs font-medium text-neutral-400">Your stack — baked into the prompt</p>
          <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Your stack">
            {stacks.map((s) => {
              const selected = s.id === stackId;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStackId(s.id)}
                  aria-pressed={selected}
                  className={cn(
                    "cursor-pointer rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors",
                    focusRing,
                    selected
                      ? "bg-white text-neutral-950"
                      : "bg-white/[0.07] text-neutral-300 hover:bg-white/[0.12] hover:text-white",
                  )}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        <ul className="grid gap-x-4 gap-y-2 sm:grid-cols-2" aria-label="What the prompt covers">
          {covers.map((item) => (
            <li key={item} className="flex items-start gap-2 text-[13px] leading-relaxed text-neutral-300">
              <Check aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" strokeWidth={2.5} />
              {item}
            </li>
          ))}
        </ul>

        <div className="rounded-lg bg-white/[0.04]">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className={cn(
              "flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-[13px] font-medium text-neutral-300 transition-colors hover:text-white",
              focusRing,
            )}
          >
            {expanded ? "Hide the full prompt" : "Read the full prompt"}
            <ChevronDown
              aria-hidden
              className={cn("h-3.5 w-3.5 shrink-0 transition-transform", expanded && "rotate-180")}
            />
          </button>
          {expanded ? (
            <pre className="max-h-72 overflow-y-auto border-t border-white/10 p-4 font-mono text-[13px] leading-relaxed whitespace-pre-wrap text-neutral-300">
              {fullPrompt}
            </pre>
          ) : null}
        </div>
      </div>
    </div>
  );
}
