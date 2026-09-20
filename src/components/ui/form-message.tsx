import { CircleAlert, CircleCheck, Info } from "lucide-react";
import { roundedRect } from "@/lib/design";
import { cn } from "@/lib/utils";

type AlertTone = "error" | "success" | "info";

const tones: Record<AlertTone, { className: string; Icon: typeof Info }> = {
  error: { className: "border-red-200 bg-red-50 text-red-800", Icon: CircleAlert },
  success: { className: "border-emerald-200 bg-emerald-50 text-emerald-800", Icon: CircleCheck },
  info: { className: "border-black/[0.06] bg-neutral-50 text-neutral-700", Icon: Info },
};

type AlertProps = {
  tone?: AlertTone;
  title?: string;
  children: React.ReactNode;
  className?: string;
};

export function Alert({ tone = "info", title, children, className }: AlertProps) {
  const { className: toneClassName, Icon } = tones[tone];

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2.5 border px-3.5 py-3 text-sm leading-relaxed",
        roundedRect,
        toneClassName,
        className,
      )}
    >
      <Icon aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0">
        {title ? <p className="font-semibold">{title}</p> : null}
        <div className={title ? "mt-0.5 opacity-90" : "font-medium"}>{children}</div>
      </div>
    </div>
  );
}

type FormMessageProps = {
  children: React.ReactNode;
  className?: string;
};

export function FormError({ children, className }: FormMessageProps) {
  return (
    <Alert tone="error" className={className}>
      {children}
    </Alert>
  );
}

export function FormSuccess({ children, className }: FormMessageProps) {
  return (
    <Alert tone="success" className={className}>
      {children}
    </Alert>
  );
}
