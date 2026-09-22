import Image from "next/image";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function GoogleButton({
  href,
  label = "Continue with Google",
  className,
  onClick,
  badge,
}: {
  href: string;
  label?: string;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
  badge?: React.ReactNode;
}) {
  return (
    // Plain anchor: this starts a full-page OAuth redirect, not a client navigation.
    <a
      href={href}
      onClick={onClick}
      className={buttonVariants({ variant: "secondary", className: cn("w-full gap-3", className) })}
    >
      <Image src="/google-g.svg" width={18} height={18} alt="" aria-hidden className="h-[18px] w-[18px]" />
      <span>{label}</span>
      {badge}
    </a>
  );
}
