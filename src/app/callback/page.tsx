import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";

export default async function CallbackPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const code = typeof params.code === "string" ? params.code : undefined;
  const error = typeof params.error === "string" ? params.error : undefined;

  return (
    <AuthShell
      title={error ? "Authorization failed" : "Authorization complete"}
      description={
        error
          ? "The OAuth request could not be completed."
          : "Your application received an authorization code."
      }
    >
      <div className="space-y-4 text-sm text-neutral-600">
        {error ? (
          <p className="rounded-xl border border-black/10 bg-neutral-50 px-4 py-3 text-neutral-700">
            {error}
          </p>
        ) : null}
        {code ? (
          <div className="rounded-xl border border-black/5 bg-neutral-50/80 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-neutral-400">
              Authorization code
            </p>
            <p className="mt-2 break-all font-mono text-xs text-black">{code}</p>
          </div>
        ) : null}
        <Link
          href="/"
          className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-black px-4 text-sm font-medium text-white transition hover:bg-neutral-800"
        >
          Back home
        </Link>
      </div>
    </AuthShell>
  );
}
