import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function Spinner({ className }: { className?: string }) {
  return (
    <LoaderCircle aria-hidden className={cn("h-4 w-4 shrink-0 animate-spin", className)} />
  );
}
