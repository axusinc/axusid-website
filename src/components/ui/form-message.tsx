import { roundedRect } from "@/lib/design";
import { cn } from "@/lib/utils";

type FormMessageProps = {
  children: React.ReactNode;
};

export function FormError({ children }: FormMessageProps) {
  return (
    <p
      role="alert"
      className={cn(
        "border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-800",
        roundedRect,
      )}
    >
      {children}
    </p>
  );
}

export function FormSuccess({ children }: FormMessageProps) {
  return (
    <p
      className={cn(
        "border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800",
        roundedRect,
      )}
    >
      {children}
    </p>
  );
}
