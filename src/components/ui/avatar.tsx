import { cn } from "@/lib/utils";

type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

const sizes: Record<AvatarSize, string> = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
  xl: "h-20 w-20 text-2xl",
};

// Muted, accessible background/foreground pairs. Picked deterministically per identity.
const palette = [
  "bg-rose-100 text-rose-800",
  "bg-amber-100 text-amber-800",
  "bg-emerald-100 text-emerald-800",
  "bg-sky-100 text-sky-800",
  "bg-indigo-100 text-indigo-800",
  "bg-violet-100 text-violet-800",
  "bg-teal-100 text-teal-800",
  "bg-stone-200 text-stone-800",
];

function hash(value: string) {
  let result = 0;
  for (let i = 0; i < value.length; i++) {
    result = (result * 31 + value.charCodeAt(i)) >>> 0;
  }
  return result;
}

export function getInitials({
  firstName,
  lastName,
  displayName,
  username,
}: {
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  username?: string | null;
}) {
  const first = firstName?.trim();
  const last = lastName?.trim();
  if (first || last) {
    return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();
  }

  const words = (displayName ?? "").replace(/^@/, "").trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
  }
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return (username?.replace(/^@/, "").slice(0, 2) || "?").toUpperCase();
}

type AvatarProps = {
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  username?: string | null;
  /** Stable identifier used to pick the color. Falls back to the username. */
  seed?: string | null;
  size?: AvatarSize;
  className?: string;
};

export function Avatar({
  firstName,
  lastName,
  displayName,
  username,
  seed,
  size = "md",
  className,
}: AvatarProps) {
  const initials = getInitials({ firstName, lastName, displayName, username });
  const color = palette[hash(seed || username || displayName || initials) % palette.length];

  return (
    <span
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold tracking-tight ring-1 ring-inset ring-black/[0.06]",
        sizes[size],
        color,
        className,
      )}
      aria-hidden
    >
      {initials}
    </span>
  );
}
