"use client";

import { useState } from "react";
import { AxusIdButton } from "@/components/ui/axusid-button";
import { focusRing } from "@/lib/design";
import { cn } from "@/lib/utils";

const tones = [
  {
    id: "white",
    label: "White",
    dark: false,
    rule: "Light surfaces, next to the Google button.",
  },
  {
    id: "black",
    label: "Black",
    dark: false,
    rule: "Light surfaces, when the button should lead.",
  },
  {
    id: "grey",
    label: "Grey",
    dark: true,
    rule: "Dark surfaces, where black disappears.",
  },
] as const;

type Tone = (typeof tones)[number]["id"];

/** Live finish switcher: pick a tone, see it on its intended surface. */
export function ButtonFinishTabs() {
  const [tone, setTone] = useState<Tone>("white");
  const active = tones.find((t) => t.id === tone) ?? tones[0];

  return (
    <div>
      <div role="tablist" aria-label="Button finish" className="flex flex-wrap gap-1.5">
        {tones.map((t) => {
          const selected = t.id === tone;
          return (
            <button
              key={t.id}
              role="tab"
              type="button"
              aria-selected={selected}
              onClick={() => setTone(t.id)}
              className={cn(
                "cursor-pointer rounded-xl px-4 py-2 text-[13px] font-medium transition-colors",
                focusRing,
                selected
                  ? "bg-neutral-950 text-white"
                  : "bg-black/[0.04] text-neutral-600 hover:bg-black/[0.08] hover:text-neutral-950",
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      <div
        role="tabpanel"
        className={cn(
          "mt-3 rounded-2xl p-4 transition-colors sm:p-5",
          active.dark ? "bg-neutral-950" : "border border-black/[0.06] bg-neutral-50",
        )}
      >
        <div className="mx-auto max-w-sm">
          <AxusIdButton href="/developers/quickstart" tone={tone} />
          <p className={cn("mt-3 text-center text-xs", active.dark ? "text-neutral-400" : "text-neutral-500")}>
            {active.rule} Same 18px mark, same label.
          </p>
        </div>
      </div>
    </div>
  );
}
