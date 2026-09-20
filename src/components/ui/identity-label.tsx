import { cn } from "@/lib/utils";

type IdentityLabelProps = {
  displayName?: string | null;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  /** Fallback when nothing else is known. */
  fallback?: string;
  size?: "sm" | "lg";
  className?: string;
};

/**
 * Renders a name + @username pair, collapsing to a single line when the
 * display name is just the username.
 */
export function IdentityLabel({
  displayName,
  username,
  firstName,
  lastName,
  fallback = "AXUS ID",
  size = "sm",
  className,
}: IdentityLabelProps) {
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
  const name = (fullName || displayName || "").trim().replace(/^@/, "");
  const handle = username?.trim().replace(/^@/, "");
  const hasDistinctName = Boolean(handle && name && name.toLowerCase() !== handle.toLowerCase());

  const primary = hasDistinctName ? name : handle ? `@${handle}` : name || fallback;

  return (
    <span className={cn("block min-w-0", className)}>
      <span
        className={cn(
          "block truncate font-semibold text-neutral-950",
          size === "lg" ? "text-base tracking-tight" : "text-sm",
        )}
      >
        {primary}
      </span>
      {hasDistinctName ? (
        <span className="block truncate text-[13px] text-neutral-500">@{handle}</span>
      ) : null}
    </span>
  );
}
