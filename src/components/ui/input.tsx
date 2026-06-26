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
          error &&
            "border-red-400 bg-red-50/50 focus:border-red-500 focus:ring-red-100",
          className,
        )}
        {...props}
      />
      {error ? (
        <p role="alert" className="text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
