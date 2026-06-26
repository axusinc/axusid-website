import { cn } from "@/lib/utils";

type ButtonProps = React.ComponentProps<"button"> & {
  variant?: "default" | "brand" | "ghost" | "outline";
};

const variants = {
  default:
    "bg-black text-white hover:bg-neutral-800 focus-visible:ring-black/20",
  brand:
    "bg-black text-white hover:bg-neutral-800 focus-visible:ring-black/20",
  ghost:
    "bg-transparent text-black hover:bg-black/5 focus-visible:ring-black/10",
  outline:
    "border border-black/10 bg-white/60 text-black hover:bg-white focus-visible:ring-black/10",
};

export function Button({
  className,
  variant = "default",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex h-11 items-center justify-center rounded-xl px-4 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-4 disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
