"use client";

import { Check, Copy } from "lucide-react";
import { useMemo, useState } from "react";
import { focusRing } from "@/lib/design";
import { cn } from "@/lib/utils";

export type ApiArg = { name: string; type: string };
export type ApiOp = {
  name: string;
  args: ApiArg[];
  returns: string;
  description: string | null;
};
export type ApiType = {
  name: string;
  kind: string;
  description: string | null;
  fields: ApiArg[] | null;
  values: string[] | null;
};

function signature(op: ApiOp) {
  const args = op.args.map((a) => `${a.name}: ${a.type}`).join(", ");
  return `${op.name}(${args}): ${op.returns}`;
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          // Clipboard unavailable — text stays visible.
        }
      }}
      aria-label={label}
      className={cn(
        "inline-flex h-7 shrink-0 items-center gap-1 rounded-lg px-2 text-xs font-medium transition-colors",
        focusRing,
        copied ? "text-emerald-600" : "text-neutral-400 hover:bg-black/[0.05] hover:text-neutral-900",
      )}
    >
      {copied ? (
        <Check aria-hidden className="h-3.5 w-3.5" strokeWidth={2.5} />
      ) : (
        <Copy aria-hidden className="h-3.5 w-3.5" />
      )}
      <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}

function OpRow({ op }: { op: ApiOp }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-black/[0.07] bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn(
          "flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left",
          focusRing,
          open && "rounded-xl",
        )}
      >
        <code className="min-w-0 flex-1 truncate font-mono text-[13px] text-neutral-900">
          {op.name}
          <span className="text-neutral-400">
            ({op.args.map((a) => a.name).join(", ") || "—"})
          </span>
        </code>
        <span className="hidden shrink-0 rounded-md bg-black/[0.04] px-2 py-0.5 font-mono text-[11px] text-neutral-500 sm:block">
          → {op.returns}
        </span>
        <span aria-hidden className={cn("shrink-0 text-neutral-400 transition-transform", open && "rotate-180")}>
          ▾
        </span>
      </button>
      {open ? (
        <div className="border-t border-black/[0.05] px-4 py-3">
          {op.description ? (
            <p className="text-[13px] leading-relaxed text-neutral-600">{op.description}</p>
          ) : null}
          <pre className="mt-3 overflow-x-auto rounded-lg bg-neutral-950 p-3 font-mono text-xs leading-relaxed text-neutral-100">
            {signature(op)}
          </pre>
          <div className="mt-2 flex justify-end">
            <CopyButton text={signature(op)} label={`Copy ${op.name} signature`} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function ApiBrowser({
  queries,
  mutations,
  types,
}: {
  queries: ApiOp[];
  mutations: ApiOp[];
  types: ApiType[];
}) {
  const [tab, setTab] = useState<"queries" | "mutations" | "types">("queries");
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const match = useMemo(() => {
    const hits = (name: string, desc: string | null) =>
      !q || name.toLowerCase().includes(q) || (desc ?? "").toLowerCase().includes(q);
    return {
      queries: queries.filter((o) => hits(o.name, o.description)),
      mutations: mutations.filter((o) => hits(o.name, o.description)),
      types: types.filter((t) => hits(t.name, t.description)),
    };
  }, [q, queries, mutations, types]);

  const tabs = [
    { id: "queries", label: "Queries", count: match.queries.length },
    { id: "mutations", label: "Mutations", count: match.mutations.length },
    { id: "types", label: "Types", count: match.types.length },
  ] as const;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <div role="tablist" aria-label="API sections" className="flex flex-wrap gap-1.5">
          {tabs.map(({ id, label, count }) => (
            <button
              key={id}
              role="tab"
              type="button"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={cn(
                "cursor-pointer rounded-xl px-3 py-1.5 text-[13px] font-medium transition-colors",
                focusRing,
                tab === id
                  ? "bg-neutral-950 text-white"
                  : "bg-black/[0.04] text-neutral-600 hover:bg-black/[0.08] hover:text-neutral-950",
              )}
            >
              {label} · {count}
            </button>
          ))}
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter operations…"
          aria-label="Filter API operations"
          autoComplete="off"
          spellCheck={false}
          className={cn(
            "h-9 min-w-0 flex-1 rounded-xl border border-black/10 bg-white px-3 text-[13px] text-neutral-900 placeholder:text-neutral-400 sm:max-w-xs",
            focusRing,
          )}
        />
      </div>

      <div role="tabpanel" className="mt-4 space-y-2">
        {tab !== "types" ? (
          (tab === "queries" ? match.queries : match.mutations).map((op) => (
            <OpRow key={op.name} op={op} />
          ))
        ) : match.types.length ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {match.types.map((t) => (
              <div key={t.name} className="rounded-xl border border-black/[0.07] bg-white p-4">
                <p className="flex items-baseline justify-between gap-2">
                  <code className="font-mono text-[13px] font-medium text-neutral-900">{t.name}</code>
                  <span className="shrink-0 text-[11px] uppercase tracking-wide text-neutral-400">{t.kind}</span>
                </p>
                {t.description ? (
                  <p className="mt-1 text-xs leading-relaxed text-neutral-500">{t.description}</p>
                ) : null}
                {t.fields ? (
                  <ul className="mt-2 space-y-1">
                    {t.fields.map((f) => (
                      <li key={f.name} className="font-mono text-xs text-neutral-600">
                        {f.name}
                        <span className="text-neutral-400">: {f.type}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {t.values ? (
                  <p className="mt-2 font-mono text-xs leading-relaxed text-neutral-600">
                    {t.values.join(" · ")}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
        {((tab === "queries" && !match.queries.length) ||
          (tab === "mutations" && !match.mutations.length) ||
          (tab === "types" && !match.types.length)) && (
          <p className="rounded-xl border border-black/[0.07] bg-white p-6 text-center text-sm text-neutral-500">
            Nothing matches “{query.trim()}”.
          </p>
        )}
      </div>
    </div>
  );
}
