import type { Metadata } from "next";
import Link from "next/link";
import { StatusPage } from "@/components/status-page";
import { buttonVariants } from "@/components/ui/button";
import { CopyField } from "@/components/ui/copy-field";

export const metadata: Metadata = { title: "Authorization result" };

export default async function CallbackPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const code = typeof params.code === "string" ? params.code : undefined;
  const error = typeof params.error === "string" ? params.error : undefined;
  const errorDescription =
    typeof params.error_description === "string" ? params.error_description : undefined;

  return (
    <StatusPage
      tone={error ? "error" : "success"}
      title={error ? "Authorization failed" : "Authorization complete"}
      description={
        error ? (
          <>
            The request could not be completed:{" "}
            <code className="rounded bg-neutral-100 px-1 py-0.5 font-mono text-xs text-neutral-700">
              {error}
            </code>
            {errorDescription ? <> — {errorDescription}</> : null}
          </>
        ) : (
          "This test callback received an authorization code."
        )
      }
      actions={
        <Link href="/" className={buttonVariants({ variant: "secondary", className: "w-full sm:w-auto" })}>
          Back to AXUS ID
        </Link>
      }
    >
      {code ? (
        <div className="space-y-3">
          <CopyField label="Authorization code" value={code} />
          <p className="text-xs leading-relaxed text-neutral-500">
            Exchange it at <code className="font-mono text-neutral-700">/oauth/token</code>. The
            response includes an IdP JWT <code className="font-mono text-neutral-700">access_token</code>,
            an opaque <code className="font-mono text-neutral-700">axus_access_token</code> for AXUS
            GraphQL APIs, and optionally <code className="font-mono text-neutral-700">id_token</code>{" "}
            and <code className="font-mono text-neutral-700">refresh_token</code>.
          </p>
        </div>
      ) : null}
    </StatusPage>
  );
}
