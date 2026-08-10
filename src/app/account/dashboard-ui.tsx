import Link from "next/link";
import { roundedRect } from "@/lib/design";
import { cn } from "@/lib/utils";

/* ── Layout ─────────────────────────────────────────────── */

export function AmbientBackground() {
  return (
    <>
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(182,28,28,0.08),transparent_30%),radial-gradient(circle_at_82%_88%,rgba(0,0,0,0.05),transparent_28%),linear-gradient(180deg,#ffffff_0%,#f4f4f4_100%)]"
        aria-hidden
      />
    </>
  );
}

type DashboardShellProps = {
  children: React.ReactNode;
};

export function DashboardShell({ children }: DashboardShellProps) {
  return (
    <div className="relative flex min-h-full flex-1 overflow-x-hidden bg-white">
      <AmbientBackground />
      {children}
    </div>
  );
}

/* ── Avatar ─────────────────────────────────────────────── */

type AvatarProps = {
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
};

export function Avatar({ username, size = "lg", className }: AvatarProps) {
  const dims = size === "lg" ? "h-24 w-24" : size === "md" ? "h-10 w-10" : "h-8 w-8";
  const seed = username || "default";
  const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aade,d1d4f9,ffd5dc,ffdfbf`;

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center rounded-full overflow-hidden bg-neutral-100 ring-[3px] ring-black/5",
        dims,
        className,
      )}
      aria-hidden
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={avatarUrl}
        alt={username || "Avatar"}
        className="h-full w-full object-cover"
      />
    </div>
  );
}

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
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
    <div className="flex flex-col items-stretch gap-3 min-[420px]:flex-row min-[420px]:items-start min-[420px]:justify-between sm:gap-4">
      <div className="min-w-0">
        <h2 className="text-xl font-semibold tracking-tight text-black">{title}</h2>
        {subtitle ? (
          <p className="mt-1 text-sm leading-relaxed text-neutral-500">{subtitle}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0 self-start">{action}</div> : null}
    </div>
  );
}

type SectionIntroProps = {
  eyebrow?: string;
  title: string;
  description: string;
};

export function SectionIntro({ eyebrow, title, description }: SectionIntroProps) {
  return (
    <div className="mb-6 border-b border-black/[0.06] pb-6 sm:mb-7 sm:pb-7">
      {eyebrow ? (
        <p className="mb-2.5 text-xs font-semibold uppercase tracking-[0.16em] text-brand">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="text-2xl font-semibold leading-tight tracking-[-0.035em] text-black sm:text-[2.25rem]">
        {title}
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-neutral-500">
        {description}
      </p>
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
      <h3 className="text-base font-semibold text-black">{title}</h3>
      {description ? (
        <p className="mt-1 text-sm text-neutral-500">{description}</p>
      ) : null}
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
    "shrink-0 text-sm font-medium text-neutral-500 transition-colors hover:text-black";

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
  hint?: string;
  children: React.ReactNode;
  mono?: boolean;
  action?: React.ReactNode;
};

export function DataRow({ label, hint, children, mono, action }: DataRowProps) {
  return (
    <div className="border-b border-black/[0.04] py-4 last:border-0">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <dt className="text-sm font-medium text-neutral-700">{label}</dt>
          {hint ? <p className="mt-0.5 text-xs text-neutral-500">{hint}</p> : null}
        </div>
        {action}
      </div>
      <dd
        className={cn(
          "mt-2 min-w-0 text-sm text-black",
        mono && "break-all font-mono text-xs sm:truncate",
        )}
      >
        {children}
      </dd>
    </div>
  );
}

type DataBlockProps = {
  label: string;
  hint?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
};

export function DataBlock({ label, hint, children, action }: DataBlockProps) {
  return (
    <div className="border-b border-black/[0.04] py-4 last:border-0">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-neutral-700">{label}</p>
          {hint ? <p className="mt-0.5 text-xs text-neutral-500">{hint}</p> : null}
        </div>
        {action}
      </div>
      <div className="mt-2 text-sm leading-relaxed text-black">{children}</div>
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
    <div
      className={cn(
        "flex min-w-0 items-center gap-2 border border-black/5 bg-neutral-50/80 px-3 py-3 sm:gap-3 sm:px-4",
        roundedRect,
      )}
    >
      <code className="min-w-0 flex-1 truncate font-mono text-xs text-black">
        {value}
      </code>
      <button
        type="button"
        onClick={onCopy}
        className={cn(
          "shrink-0 px-2.5 py-1 text-xs font-medium transition-colors",
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

export function StatusBadge({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-600",
        className,
      )}
    >
      {children}
    </span>
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
    <div className="flex shrink-0 items-center gap-1">
      <button
        type="button"
        onClick={onCancel}
        disabled={isSubmitting}
        aria-label="Cancel"
        className="inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-md px-2 text-sm font-medium text-neutral-500 transition-colors hover:bg-black/[0.04] hover:text-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <XIcon className="h-3.5 w-3.5 sm:hidden" />
        <span className="hidden sm:inline">Cancel</span>
      </button>
      <button
        type="submit"
        form={formId}
        disabled={isSubmitting}
        aria-label={isSubmitting ? "Saving" : "Save"}
        className="inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-md px-2 text-sm font-medium text-emerald-600 transition-colors hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? (
          <SpinnerIcon className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <CheckIcon className="h-3.5 w-3.5 sm:hidden" />
        )}
        <span className="hidden sm:inline">{isSubmitting ? "Saving" : "Save"}</span>
      </button>
    </div>
  );
}

export const inlineInputClassName =
  `flex h-11 w-full min-w-0 border border-black/10 bg-white/80 px-4 text-sm text-black placeholder:text-neutral-400 backdrop-blur-sm transition focus:border-black/30 focus:outline-none focus:ring-4 focus:ring-black/5 ${roundedRect}`;

export const inlineTextareaClassName =
  `flex min-h-20 w-full resize-none border border-black/10 bg-white/80 px-4 py-3 text-sm leading-relaxed text-black placeholder:text-neutral-400 backdrop-blur-sm transition focus:border-black/30 focus:outline-none focus:ring-4 focus:ring-black/5 ${roundedRect}`;
