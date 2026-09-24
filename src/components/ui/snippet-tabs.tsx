"use client";

import { useState } from "react";
import { focusRing } from "@/lib/design";
import { cn } from "@/lib/utils";
import { CodeBlock } from "@/components/ui/code-block";

export type Snippet = {
  id: string;
  label: string;
  code: string;
};

export function SnippetTabs({ snippets, defaultId }: { snippets: Snippet[]; defaultId?: string }) {
  const [activeId, setActiveId] = useState(defaultId ?? snippets[0]?.id);
  const active = snippets.find((s) => s.id === activeId) ?? snippets[0];

  return (
    <div>
      <div role="tablist" aria-label="Framework" className="flex flex-wrap gap-1.5">
        {snippets.map((snippet) => {
          const selected = snippet.id === active?.id;
          return (
            <button
              key={snippet.id}
              role="tab"
              type="button"
              aria-selected={selected}
              onClick={() => setActiveId(snippet.id)}
              className={cn(
                "cursor-pointer rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors",
                focusRing,
                selected
                  ? "bg-neutral-950 text-white"
                  : "bg-black/[0.04] text-neutral-600 hover:bg-black/[0.08] hover:text-neutral-950",
              )}
            >
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
