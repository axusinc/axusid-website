import type { Metadata } from "next";
import Link from "next/link";
import { StatusPage } from "@/components/status-page";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <StatusPage
      title="Page not found"
      description="The page you’re looking for doesn’t exist or has moved."
      actions={
        <>
          <Link href="/" className={buttonVariants({ className: "w-full sm:w-auto" })}>
            Go home
          </Link>
          <Link href="/account" className={buttonVariants({ variant: "secondary", className: "w-full sm:w-auto" })}>
            Manage account
          </Link>
        </>
      }
    />
  );
}
