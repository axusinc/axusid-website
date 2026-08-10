import { cardSurface, roundedRect } from "@/lib/design";
import { cn } from "@/lib/utils";

type CardProps = React.ComponentProps<"div">;

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn(cardSurface, roundedRect, "p-4 sm:p-6", className)}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: CardProps) {
  return <div className={cn("mb-6 space-y-2 text-center", className)} {...props} />;
}

export function CardTitle({ className, ...props }: CardProps) {
  return (
    <h1
      className={cn("text-2xl font-semibold tracking-tight text-black", className)}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: CardProps) {
  return (
    <p className={cn("text-sm leading-relaxed text-neutral-500", className)} {...props} />
  );
}
