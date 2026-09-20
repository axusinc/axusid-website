/** Standard 12px corner radius for rectangular UI elements. */
export const roundedRect = "rounded-xl";

/** Shared focus ring for every interactive element. */
export const focusRing =
  "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black/10";

/** Primary content surface (cards, panels). */
export const cardSurface =
  "border border-black/[0.07] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]";

/** Recessed surface for nested blocks inside a card. */
export const insetSurface = "border border-black/[0.06] bg-neutral-50";

export const popoverSurface =
  "border border-black/10 bg-white/95 backdrop-blur-2xl shadow-[0_12px_36px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.04)]";

/** Elevated shell used by the sign-in / sign-up / consent flows. */
export const shellSurface =
  "border border-black/[0.06] bg-white/90 shadow-[0_24px_80px_rgba(0,0,0,0.08),0_3px_12px_rgba(0,0,0,0.04)] backdrop-blur-2xl";

/** Small uppercase label used above groups of content. */
export const eyebrow =
  "text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400";
