export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
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

