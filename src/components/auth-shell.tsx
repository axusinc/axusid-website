import { Logo } from "@/components/ui/logo";
import { roundedRect } from "@/lib/design";
import { cn } from "@/lib/utils";

type AuthShellProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidthClass?: string;
  variant?: "default" | "sign-in";
  signInStep?: 1 | 2;
};

export function AuthShell({
  title,
  description,
  children,
  footer,
  maxWidthClass = "max-w-md",
  variant = "default",
  signInStep,
}: AuthShellProps) {
  if (variant === "sign-in") {
    return (
      <main className="relative flex min-h-[100dvh] flex-1 items-center justify-center overflow-x-hidden bg-white px-3 py-3 sm:px-6 sm:py-12">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(182,28,28,0.08),transparent_30%),radial-gradient(circle_at_82%_88%,rgba(0,0,0,0.05),transparent_28%),linear-gradient(180deg,#ffffff_0%,#f4f4f4_100%)]" />

        <div className={cn("relative w-full", maxWidthClass)}>
          <section className="overflow-hidden rounded-[18px] border border-black/[0.06] bg-white/85 shadow-[0_16px_48px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.04)] backdrop-blur-2xl sm:rounded-[24px] sm:shadow-[0_24px_80px_rgba(0,0,0,0.09),0_3px_12px_rgba(0,0,0,0.04)] lg:grid lg:grid-cols-[minmax(280px,0.82fr)_minmax(380px,1fr)]">
            <header className="relative overflow-hidden border-b border-black/[0.06] bg-neutral-50/80 px-5 py-6 sm:px-10 sm:py-10 lg:min-h-[520px] lg:border-b-0 lg:border-r">
              <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand/[0.07] blur-3xl" />
              <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-black/[0.04] blur-3xl" />

              <div className="relative flex h-full flex-col">
                <div className="flex items-center gap-3">
                  <Logo size={46} />
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                    AXUS ID
                  </span>
                </div>

                <div className="mt-6 sm:mt-10 lg:mt-16">
                  {signInStep ? (
                    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-brand">
                      Step {signInStep} of 2
                    </p>
                  ) : null}
                  <h1 className="max-w-sm text-2xl font-semibold leading-tight tracking-[-0.035em] text-black sm:text-[2.25rem]">
                    {title}
                  </h1>
                  {description ? (
                    <p className="mt-4 max-w-sm text-sm leading-relaxed text-neutral-500">
                      {description}
                    </p>
                  ) : null}
                </div>

                {signInStep ? (
                  <div className="mt-6 flex max-w-[180px] gap-2 sm:mt-8" aria-label={`Step ${signInStep} of 2`}>
                    <span className="h-1.5 flex-1 rounded-full bg-brand" />
                    <span
                      className={cn(
                        "h-1.5 flex-1 rounded-full",
                        signInStep === 2 ? "bg-brand" : "bg-black/10",
                      )}
                    />
                  </div>
                ) : null}

              </div>
            </header>

            <div className="flex min-w-0 flex-col justify-center px-5 py-6 sm:px-10 sm:py-10 lg:px-12 lg:py-12">
              {children}
            </div>
          </section>

          {footer ? (
            <div className="px-6 py-5 text-center text-sm text-neutral-600 sm:px-10">
              {footer}
            </div>
          ) : null}
        </div>
      </main>
    );
  }

  return (
    <div className="relative flex min-h-[100dvh] flex-1 items-center justify-center overflow-x-hidden px-3 py-6 sm:px-4 sm:py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,0,0,0.04),transparent_55%),linear-gradient(180deg,#ffffff_0%,#f5f5f5_100%)]" />
      <div className="pointer-events-none absolute -left-24 top-16 h-72 w-72 rounded-full bg-black/[0.03] blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-10 h-64 w-64 rounded-full bg-brand/[0.06] blur-3xl" />

      <div className={cn("relative w-full transition-all duration-300", maxWidthClass)}>
        <div className="mb-8 flex flex-col items-center gap-4">
          <Logo size={56} />
          <div className="text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-black sm:text-3xl">
              {title}
            </h1>
            {description ? (
              <p className="mt-2 text-sm leading-relaxed text-neutral-500">
                {description}
              </p>
            ) : null}
          </div>
        </div>

        <div className={cn("border border-black/5 bg-white/70 p-5 shadow-[0_8px_32px_rgba(0,0,0,0.06)] backdrop-blur-xl sm:p-8", roundedRect)}>
          {children}
        </div>

        {footer ? <div className="mt-6 text-center text-sm text-neutral-500">{footer}</div> : null}
      </div>
    </div>
  );
}
