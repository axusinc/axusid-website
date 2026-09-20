import { twMerge } from "tailwind-merge";

/** Joins class names, letting later Tailwind utilities override conflicting earlier ones. */
export function cn(...classes: Array<string | false | null | undefined>) {
  return twMerge(classes.filter(Boolean).join(" "));
}

export function isRedirectError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  if ("digest" in error && typeof (error as { digest: unknown }).digest === "string") {
    return (error as { digest: string }).digest.startsWith("NEXT_REDIRECT");
  }
  if (error instanceof Error) {
    return (
      error.message === "NEXT_REDIRECT" ||
      error.message.includes("NEXT_REDIRECT")
    );
  }
  return false;
}


/** Formats an ISO date as e.g. "Sep 19, 2026" in the viewer's locale. */
export function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
