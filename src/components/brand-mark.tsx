import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { focusRing } from "@/lib/design";
import { cn } from "@/lib/utils";

/** Logo + wordmark, linking home. */
export function BrandMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <Link
      href="/"
      className={cn("inline-flex items-center gap-2.5 rounded-lg", focusRing, className)}
      aria-label="AXUS ID home"
    >
      <Logo size={size} />
      <span className="text-[15px] font-semibold tracking-tight text-neutral-950">
        AXUS <span className="text-neutral-400">ID</span>
      </span>
    </Link>
  );
}

export function SiteFooter({ className }: { className?: string }) {
  return (
    <footer className={cn("flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-neutral-400", className)}>
      <span>© AXUS ID</span>
      <Link href="/" className="transition-colors hover:text-neutral-700">
        Home
      </Link>
      <Link href="/#developers" className="transition-colors hover:text-neutral-700">
        Developers
      </Link>
      <Link href="/account" className="transition-colors hover:text-neutral-700">
        Manage account
      </Link>
    </footer>
  );
}
