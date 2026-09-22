import { Spinner } from "@/components/ui/spinner";
import { focusRing, roundedRect } from "@/lib/design";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "danger-ghost";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-neutral-950 text-white shadow-[0_1px_2px_rgba(0,0,0,0.12)] hover:bg-neutral-800",
  secondary:
    "border border-black/10 bg-white text-neutral-900 shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:border-black/15 hover:bg-neutral-50",
  ghost: "bg-transparent text-neutral-700 hover:bg-black/[0.05] hover:text-black",
  danger: "bg-red-600 text-white shadow-[0_1px_2px_rgba(0,0,0,0.12)] hover:bg-red-700",
  "danger-ghost": "bg-transparent text-red-600 hover:bg-red-50 hover:text-red-700",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 gap-1.5 px-3 text-[13px]",
  md: "h-10 gap-2 px-4 text-sm",
  lg: "h-11 gap-2 px-5 text-sm",
  icon: "h-9 w-9 p-0",
};

export function buttonVariants({
  variant = "primary",
  size = "lg",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}) {
  return cn(
    "relative inline-flex shrink-0 cursor-pointer select-none items-center justify-center whitespace-nowrap font-medium transition-[background-color,border-color,color,box-shadow] duration-150 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
    focusRing,
    size === "sm" ? "rounded-lg" : roundedRect,
    variants[variant],
    sizes[size],
    className,
  );
}

type ButtonProps = React.ComponentProps<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner and disables the button. */
  loading?: boolean;
};

export function Button({
  className,
  variant = "primary",
  size = "lg",
  type = "button",
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonVariants({ variant, size, className })}
      {...props}
    >
      {loading ? <Spinner /> : null}
      {children}
    </button>
  );
}
