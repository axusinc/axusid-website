import { Check, X } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { inputClassName, textareaClassName } from "@/components/ui/input";
import { focusRing } from "@/lib/design";
import { cn } from "@/lib/utils";

/* ── Section chrome ─────────────────────────────────────── */

type SectionIntroProps = {
  title: string;
  description: string;
};

export function SectionIntro({ title, description }: SectionIntroProps) {
  return (
    <div className="mb-6 sm:mb-8">
      <h2 className="text-2xl font-semibold tracking-[-0.025em] text-neutral-950 sm:text-[1.75rem]">
        {title}
      </h2>
      <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-neutral-500">{description}</p>
    </div>
  );
}

type SubsectionTitleProps = {
  title: string;
  description?: string;
};

export function SubsectionTitle({ title, description }: SubsectionTitleProps) {
  return (
    <div className="mb-4">
      <h3 className="text-[15px] font-semibold tracking-tight text-neutral-950">{title}</h3>
      {description ? (
        <p className="mt-1 text-sm leading-relaxed text-neutral-500">{description}</p>
      ) : null}
    </div>
  );
}

/* ── Data display ───────────────────────────────────────── */

type DataRowProps = {
  label: string;
  hint?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
};

/**
 * One editable row in a settings list: label + hint on the left, value below,
 * action on the right.
 */
export function DataRow({ label, hint, children, action }: DataRowProps) {
  return (
    <div className="border-b border-black/[0.05] py-5 first:pt-0 last:border-0 last:pb-0">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <dt className="text-sm font-medium text-neutral-900">{label}</dt>
          {hint ? <p className="mt-0.5 text-[13px] text-neutral-500">{hint}</p> : null}
        </div>
        {action}
      </div>
      <dd className="mt-2.5 min-w-0 text-sm leading-relaxed text-neutral-700">{children}</dd>
    </div>
  );
}

/* ── Inline editing ─────────────────────────────────────── */

type InlineEditActionsProps = {
  formId: string;
  onCancel: () => void;
  isSubmitting?: boolean;
};

export function InlineEditActions({
  formId,
  onCancel,
  isSubmitting = false,
}: InlineEditActionsProps) {
  const base = cn(
    "inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
    focusRing,
  );

  return (
    <div className="flex shrink-0 items-center gap-1">
      <button
        type="button"
        onClick={onCancel}
        disabled={isSubmitting}
        aria-label="Cancel"
        className={cn(base, "text-neutral-600 hover:bg-black/[0.05] hover:text-neutral-900")}
      >
        <X aria-hidden className="h-3.5 w-3.5 sm:hidden" />
        <span className="hidden sm:inline">Cancel</span>
      </button>
      <button
        type="submit"
        form={formId}
        disabled={isSubmitting}
        aria-label={isSubmitting ? "Saving" : "Save"}
        className={cn(base, "bg-neutral-950 text-white hover:bg-neutral-800")}
      >
        {isSubmitting ? (
          <Spinner className="h-3.5 w-3.5" />
        ) : (
          <Check aria-hidden className="h-3.5 w-3.5 sm:hidden" />
        )}
        <span className="hidden sm:inline">{isSubmitting ? "Saving…" : "Save"}</span>
      </button>
    </div>
  );
}

export const inlineInputClassName = inputClassName;

export const inlineTextareaClassName = cn(textareaClassName, "resize-none");
