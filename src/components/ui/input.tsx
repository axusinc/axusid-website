import { cn } from "@/lib/utils";

type InputProps = React.ComponentProps<"input"> & {
  label?: string;
  error?: string;
};

export function Input({ className, label, error, id, ...props }: InputProps) {
  const inputId = id ?? props.name;

  return (
    <div className="space-y-2">
      {label ? (
        <label htmlFor={inputId} className="text-sm font-medium text-neutral-700">
          {label}
        </label>
      ) : null}
      <input
        id={inputId}
        className={cn(
          "flex h-11 w-full rounded-xl border border-black/10 bg-white/80 px-4 text-sm text-black placeholder:text-neutral-400 backdrop-blur-sm transition focus:border-black/30 focus:outline-none focus:ring-4 focus:ring-black/5",
          error && "border-black/40 focus:border-black/50 focus:ring-black/10",
          className,
        )}
        {...props}
      />
      {error ? <p className="text-sm text-neutral-700">{error}</p> : null}
    </div>
  );
}
