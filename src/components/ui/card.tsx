import { cn } from "@/lib/utils";

type CardProps = React.ComponentProps<"div">;

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-black/5 bg-white/70 p-8 shadow-[0_8px_32px_rgba(0,0,0,0.06)] backdrop-blur-xl",
        className,
      )}
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
