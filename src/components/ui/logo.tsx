import Image from "next/image";
import { cn } from "@/lib/utils";

const MARK_WIDTH = 1177;
const MARK_HEIGHT = 941;

type LogoProps = {
  size?: number;
  className?: string;
};

export function Logo({ size = 40, className }: LogoProps) {
  return (
    <Image
      src="/axusid-mark.png"
      alt="AXUS ID"
      width={MARK_WIDTH}
      height={MARK_HEIGHT}
      className={cn("h-auto object-contain", className)}
      style={{ width: size }}
      priority
    />
  );
}
