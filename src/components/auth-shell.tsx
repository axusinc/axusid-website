import { Logo } from "@/components/ui/logo";
import { roundedRect } from "@/lib/design";
import { cn } from "@/lib/utils";

type AuthShellProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidthClass?: string;
};

export function AuthShell({
  title,
  description,
  children,
  footer,
  maxWidthClass = "max-w-md",
}: AuthShellProps) {
  return (
    <div className="relative flex min-h-full flex-1 items-center justify-center overflow-hidden px-4 py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,0,0,0.04),transparent_55%),linear-gradient(180deg,#ffffff_0%,#f5f5f5_100%)]" />
      <div className="pointer-events-none absolute -left-24 top-16 h-72 w-72 rounded-full bg-black/[0.03] blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-10 h-64 w-64 rounded-full bg-brand/[0.06] blur-3xl" />

      <div className={cn("relative w-full transition-all duration-300", maxWidthClass)}>
        <div className="mb-8 flex flex-col items-center gap-4">
          <Logo size={56} />
          <div className="text-center">
            <h1 className="text-3xl font-semibold tracking-tight text-black">
              {title}
            </h1>
            {description ? (
              <p className="mt-2 text-sm leading-relaxed text-neutral-500">
                {description}
              </p>
            ) : null}
          </div>
        </div>

        <div className={cn("border border-black/5 bg-white/70 p-6 sm:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.06)] backdrop-blur-xl", roundedRect)}>
          {children}
        </div>

        {footer ? <div className="mt-6 text-center text-sm text-neutral-500">{footer}</div> : null}
      </div>
    </div>
  );
}
