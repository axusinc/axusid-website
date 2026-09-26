"use client";

import { Atom, FileCode2, Triangle } from "lucide-react";
import { useState } from "react";
import { focusRing } from "@/lib/design";
import { cn } from "@/lib/utils";
import { CodeBlock } from "@/components/ui/code-block";

export type Snippet = {
  id: string;
  label: string;
  code: string;
};

const icons: Record<string, typeof Atom> = {
  html: FileCode2,
  react: Atom,
  nextjs: Triangle,
};

export function SnippetTabs({ snippets, defaultId }: { snippets: Snippet[]; defaultId?: string }) {
  const [activeId, setActiveId] = useState(defaultId ?? snippets[0]?.id);
  const active = snippets.find((s) => s.id === activeId) ?? snippets[0];

  return (
    <div>
      <div role="tablist" aria-label="Framework" className="flex flex-wrap gap-1.5">
        {snippets.map((snippet) => {
          const selected = snippet.id === active?.id;
          const Icon = icons[snippet.id];
          return (
            <button
              key={snippet.id}
              role="tab"
              type="button"
              aria-selected={selected}
              onClick={() => setActiveId(snippet.id)}
              className={cn(
                "inline-flex cursor-pointer items-center gap-2 rounded-xl px-3 py-1.5 text-[13px] font-medium transition-colors",
                focusRing,
                selected
                  ? "bg-neutral-950 text-white"
                  : "bg-black/[0.04] text-neutral-600 hover:bg-black/[0.08] hover:text-neutral-950",
              )}
            >
              {Icon ? <Icon aria-hidden className="h-3.5 w-3.5" /> : null}
              {snippet.label}
            </button>
          );
        })}
      </div>
      <div role="tabpanel" className="mt-3">
        {active ? <CodeBlock key={active.id} label={active.label} code={active.code} /> : null}
      </div>
    </div>
  );
}
