import { BrandMark, SiteFooter } from "@/components/brand-mark";
import { PageBackground } from "@/components/page-background";
import { shellSurface } from "@/lib/design";
import { cn } from "@/lib/utils";

type AuthShellProps = {
  /** Large heading on the left (desktop) / top (mobile) panel. */
  title: string;
  description?: React.ReactNode;
  /** Extra context under the heading, e.g. the application requesting sign-in. */
  context?: React.ReactNode;
  /** Optional progress indicator for multi-step flows. */
  step?: { current: number; total: number };
  children: React.ReactNode;
};

export function AuthShell({ title, description, context, step, children }: AuthShellProps) {
  return (
    <div className="relative flex min-h-[100dvh] flex-1 flex-col items-center justify-center px-3 py-4 sm:px-6 sm:py-10">
      <PageBackground />

      <main className="w-full max-w-[920px] animate-[fadeIn_0.35s_ease-out]">
        <section
          className={cn(
            "overflow-hidden rounded-[20px] sm:rounded-[24px] lg:grid lg:grid-cols-[minmax(300px,0.85fr)_minmax(400px,1fr)]",
            shellSurface,
          )}
        >
          <header className="relative overflow-hidden border-b border-black/[0.06] bg-neutral-50/80 px-5 py-6 sm:px-10 sm:py-9 lg:flex lg:min-h-[540px] lg:flex-col lg:border-b-0 lg:border-r lg:py-10">
            <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-brand/[0.07] blur-3xl" />

            <div className="relative">
              <BrandMark size={30} />
            </div>

            <div className="relative mt-6 sm:mt-10 lg:my-auto lg:pb-8">
              {step ? (
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-brand">
                  Step {step.current} of {step.total}
                </p>
              ) : null}
              <h1 className="max-w-sm text-balance text-[1.625rem] font-semibold leading-[1.15] tracking-[-0.03em] text-neutral-950 sm:text-[2.125rem]">
                {title}
              </h1>
              {description ? (
                <p className="mt-3 max-w-sm text-pretty text-sm leading-relaxed text-neutral-500 sm:mt-4">
                  {description}
                </p>
              ) : null}
              {step ? (
                <div
                  className="mt-5 flex max-w-[180px] gap-1.5 sm:mt-7"
                  role="progressbar"
                  aria-valuemin={1}
                  aria-valuemax={step.total}
                  aria-valuenow={step.current}
                  aria-label={`Step ${step.current} of ${step.total}`}
                >
                  {Array.from({ length: step.total }, (_, index) => (
                    <span
                      key={index}
                      className={cn(
                        "h-1 flex-1 rounded-full transition-colors duration-300",
                        index < step.current ? "bg-brand" : "bg-black/10",
                      )}
                    />
                  ))}
                </div>
              ) : null}
              {context ? <div className="mt-6 sm:mt-8">{context}</div> : null}
            </div>
          </header>

          <div className="flex min-w-0 flex-col justify-center px-5 py-7 sm:px-10 sm:py-10 lg:px-12 lg:py-12">
            {children}
          </div>
        </section>
      </main>

      <SiteFooter className="mt-6 sm:mt-8" />
    </div>
  );
}

/** Heading block at the top of the form panel. */
export function AuthPanelHeading({
  title,
  description,
}: {
  title: string;
  description?: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <h2 className="text-xl font-semibold tracking-tight text-neutral-950">{title}</h2>
      {description ? (
        <p className="mt-1.5 text-sm leading-relaxed text-neutral-500">{description}</p>
      ) : null}
    </div>
  );
}
