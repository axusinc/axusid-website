import { roundedRect } from "@/lib/design";
import { cn } from "@/lib/utils";

export const controlClassName = cn(
  "flex w-full min-w-0 border border-black/[0.12] bg-white text-sm text-neutral-950 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-[border-color,box-shadow] duration-150 placeholder:text-neutral-400 hover:border-black/20 focus:border-neutral-900/40 focus:outline-none focus:ring-4 focus:ring-black/[0.06] disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-500",
  "aria-[invalid=true]:border-red-400 aria-[invalid=true]:focus:border-red-500 aria-[invalid=true]:focus:ring-red-500/10",
  roundedRect,
);

export const inputClassName = cn(controlClassName, "h-11 px-3.5");
export const textareaClassName = cn(controlClassName, "min-h-24 px-3.5 py-3 leading-relaxed");

type FieldProps = {
  id: string;
  label?: string;
  hint?: React.ReactNode;
  error?: string;
  children: React.ReactNode;
  className?: string;
};

export function Field({ id, label, hint, error, children, className }: FieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label ? (
        <label htmlFor={id} className="block text-sm font-medium text-neutral-800">
          {label}
        </label>
      ) : null}
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-[13px] font-medium text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-[13px] leading-relaxed text-neutral-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function describedBy(id: string, error?: string, hint?: React.ReactNode) {
  if (error) return `${id}-error`;
  if (hint) return `${id}-hint`;
  return undefined;
}

type InputProps = React.ComponentProps<"input"> & {
  label?: string;
  hint?: React.ReactNode;
  error?: string;
  /** Element rendered inside the right edge of the input (icon, toggle, status). */
  trailing?: React.ReactNode;
  containerClassName?: string;
};

export function Input({
  className,
  containerClassName,
  label,
  hint,
  error,
  trailing,
  id,
  ...props
}: InputProps) {
  const inputId = id ?? props.name ?? "input";

  return (
    <Field id={inputId} label={label} hint={hint} error={error} className={containerClassName}>
      <div className="relative">
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(inputId, error, hint)}
          className={cn(inputClassName, trailing ? "pr-11" : null, className)}
          {...props}
        />
        {trailing ? (
          <div className="absolute inset-y-0 right-1.5 flex items-center">{trailing}</div>
        ) : null}
      </div>
    </Field>
  );
}

type TextareaProps = React.ComponentProps<"textarea"> & {
  label?: string;
  hint?: React.ReactNode;
  error?: string;
};

export function Textarea({ className, label, hint, error, id, ...props }: TextareaProps) {
  const inputId = id ?? props.name ?? "textarea";

  return (
    <Field id={inputId} label={label} hint={hint} error={error}>
      <textarea
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(inputId, error, hint)}
        className={cn(textareaClassName, className)}
        {...props}
      />
    </Field>
  );
}
