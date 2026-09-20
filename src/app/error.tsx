"use client";

import Link from "next/link";
import { useEffect } from "react";
import { StatusPage } from "@/components/status-page";
import { Button, buttonVariants } from "@/components/ui/button";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusPage
      tone="error"
      title="Something went wrong"
      description={
        <>
          We couldn’t load this page. Try again in a moment.
          {error.digest ? (
            <span className="mt-3 block font-mono text-xs text-neutral-400">Reference: {error.digest}</span>
          ) : null}
        </>
      }
      actions={
        <>
          <Button className="w-full sm:w-auto" onClick={() => unstable_retry()}>
            Try again
          </Button>
          <Link href="/" className={buttonVariants({ variant: "secondary", className: "w-full sm:w-auto" })}>
            Go home
          </Link>
        </>
      }
    />
  );
}
