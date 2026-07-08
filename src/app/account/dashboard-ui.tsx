import Link from "next/link";
import { cn } from "@/lib/utils";
import { roundedRect } from "@/lib/design";

/* ── Layout ─────────────────────────────────────────────── */

export function AmbientBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-[#f8f8f8]" />
      <div className="absolute -left-[20%] top-[-10%] h-[60vh] w-[60vw] rounded-full bg-neutral-300/30 blur-[120px]" />
      <div className="absolute -right-[15%] top-[20%] h-[50vh] w-[50vw] rounded-full bg-brand/[0.07] blur-[100px]" />
      <div className="absolute bottom-[-20%] left-[30%] h-[40vh] w-[40vw] rounded-full bg-neutral-400/20 blur-[100px]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.8),transparent_70%)]" />
    </div>
  );
}

type DashboardShellProps = {
  children: React.ReactNode;
};

export function DashboardShell({ children }: DashboardShellProps) {
  return (
    <div className="relative min-h-screen">
      <AmbientBackground />
      {children}
    </div>
  );
}

/* ── Surfaces ───────────────────────────────────────────── */

export const glassSurface =
  `${roundedRect} border border-white/50 bg-white/25 backdrop-blur-2xl`;

export const glassSurfaceStrong =
  `${roundedRect} border border-white/60 bg-white/45 backdrop-blur-3xl`;

/* ── Avatar ─────────────────────────────────────────────── */

type AvatarProps = {
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  size?: "md" | "lg";
};

export function Avatar({ firstName, lastName, username, size = "lg" }: AvatarProps) {
  const initials =
    [firstName?.[0], lastName?.[0]].filter(Boolean).join("").toUpperCase() ||
    username?.[0]?.toUpperCase() ||
    "·";

  const dims = size === "lg" ? "h-24 w-24 text-3xl" : "h-10 w-10 text-sm";

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center rounded-full font-light tracking-tight text-white",
        "bg-gradient-to-b from-neutral-700 to-neutral-900",
        "ring-[3px] ring-white/60",
        dims,
      )}
      aria-hidden
    >
      {initials}
    </div>
  );
}

/* ── Panel chrome ───────────────────────────────────────── */

type PanelHeaderProps = {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
};

export function PanelHeader({ title, subtitle, action }: PanelHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="text-base font-medium tracking-tight text-neutral-900">{title}</h2>
        {subtitle ? (
          <p className="mt-0.5 text-[13px] text-neutral-500">{subtitle}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

type TextActionProps = {
  onClick?: () => void;
  href?: string;
  children: React.ReactNode;
};

export function TextAction({ onClick, href, children }: TextActionProps) {
  const className =
    "shrink-0 text-[13px] font-medium text-neutral-500 transition-colors hover:text-neutral-900";

  if (href) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={cn(className, "cursor-pointer")}>
      {children}
    </button>
  );
}

/* ── Data display ───────────────────────────────────────── */

type DataRowProps = {
  label: string;
  children: React.ReactNode;
  mono?: boolean;
  action?: React.ReactNode;
};

export function DataRow({ label, children, mono, action }: DataRowProps) {
  return (
    <div className="border-b border-black/[0.04] py-4 last:border-0">
      <div className="flex items-start justify-between gap-4">
        <dt className="text-[13px] text-neutral-400">{label}</dt>
        {action}
      </div>
      <dd
        className={cn(
          "mt-2 min-w-0 text-[13px] text-neutral-800",
          mono && "truncate font-mono text-xs",
        )}
      >
        {children}
      </dd>
    </div>
  );
}

type DataBlockProps = {
  label: string;
  children: React.ReactNode;
  action?: React.ReactNode;
};

export function DataBlock({ label, children, action }: DataBlockProps) {
  return (
    <div className="border-b border-black/[0.04] py-4 last:border-0">
      <div className="flex items-start justify-between gap-4">
        <p className="text-[13px] text-neutral-400">{label}</p>
        {action}
      </div>
      <div className="mt-2 text-[13px] leading-relaxed text-neutral-800">{children}</div>
    </div>
  );
}

/* ── Copy ───────────────────────────────────────────────── */

type CopyChipProps = {
  value: string;
  copied: boolean;
  onCopy: () => void;
};

export function CopyChip({ value, copied, onCopy }: CopyChipProps) {
  return (
    <div className={cn("flex items-center gap-3 border border-white/50 bg-white/30 px-4 py-3 backdrop-blur-xl", roundedRect)}>
      <code className="min-w-0 flex-1 truncate font-mono text-[11px] text-neutral-600">
        {value}
      </code>
      <button
        type="button"
        onClick={onCopy}
        className={cn(
          "shrink-0 px-2.5 py-1 text-[11px] font-medium transition-colors",
          roundedRect,
          copied
            ? "bg-emerald-500/10 text-emerald-700"
            : "bg-black/[0.04] text-neutral-500 hover:bg-black/[0.07] hover:text-neutral-800",
        )}
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

/* ── Status badge ───────────────────────────────────────── */

export function StatusBadge({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/60 bg-emerald-50/50 px-3 py-1.5 backdrop-blur-sm">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      <span className="text-[12px] font-medium text-emerald-800">{children}</span>
    </div>
  );
}

/* ── Inline editing ─────────────────────────────────────── */

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

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
  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <button
        type="button"
        onClick={onCancel}
        disabled={isSubmitting}
        aria-label="Cancel"
        className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-black/[0.04] hover:text-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <XIcon className="h-3.5 w-3.5" />
      </button>
      <button
        type="submit"
        form={formId}
        disabled={isSubmitting}
        aria-label={isSubmitting ? "Saving" : "Save"}
        className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-emerald-600 transition-colors hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <CheckIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export const inlineInputClassName =
  `w-full min-w-0 border border-white/60 bg-white/40 px-2.5 py-1.5 text-[13px] text-neutral-800 placeholder:text-neutral-400 backdrop-blur-xl transition focus:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-black/[0.04] ${roundedRect}`;

export const inlineTextareaClassName =
  `flex min-h-20 w-full resize-none border border-white/60 bg-white/40 px-3 py-2 text-[13px] leading-relaxed text-neutral-900 placeholder:text-neutral-400 backdrop-blur-xl transition focus:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-black/[0.04] ${roundedRect}`;

/* ── Form inputs ────────────────────────────────────────── */

export const textareaClassName =
  `flex min-h-28 w-full resize-none border border-white/60 bg-white/40 px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 backdrop-blur-xl transition focus:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-black/[0.04] ${roundedRect}`;

export const fieldLabelClassName = "text-[13px] font-medium text-neutral-500";
