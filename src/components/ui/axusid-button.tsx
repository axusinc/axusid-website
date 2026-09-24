import Image from "next/image";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AxusIdButtonProps = {
  href: string;
  label?: string;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
  badge?: React.ReactNode;
  /**
   * Button finish.
   * - "white" and "black" on light surfaces (white pairs with the Google button).
   * - "grey" and "black" on dark surfaces.
   * The mark is the TM-free symbol at the same 18px optical size as the Google
   * "G" on all three. Full TM lockups (/icon-tm.png, /icon-tm-dark.png) are
   * reserved for 28px and up.
   */
  tone?: "white" | "black" | "grey";
};

/**
 * Official "Continue with AXUS ID" button for third-party apps.
 * Plain anchor: starts a full-page OAuth redirect, not client navigation.
 * Same height and rhythm as GoogleButton so both can sit side by side.
 */
export function AxusIdButton({
  href,
  label = "Continue with AXUS ID",
  className,
  onClick,
  badge,
  tone = "white",
}: AxusIdButtonProps) {
  return (
    <a
      href={href}
      onClick={onClick}
      className={buttonVariants({
        variant: tone === "white" ? "secondary" : "primary",
        className: cn(
          "w-full gap-3",
          tone === "grey" && "border-transparent bg-neutral-800 text-white hover:bg-neutral-700",
          className,
        ),
      })}
    >
      <Image
        src="/axus-mark.png"
        width={869}
        height={905}
        alt=""
        aria-hidden
        className="h-[18px] w-auto shrink-0"
      />
      <span>{label}</span>
      {badge}
    </a>
  );
}
