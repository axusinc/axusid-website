import { CircleAlert, CircleCheck, Compass } from "lucide-react";
import { BrandMark, SiteFooter } from "@/components/brand-mark";
import { PageBackground } from "@/components/page-background";
import { shellSurface } from "@/lib/design";
import { cn } from "@/lib/utils";

type StatusTone = "error" | "success" | "neutral";

const toneStyles: Record<StatusTone, { className: string; Icon: typeof CircleAlert }> = {
  error: { className: "bg-red-50 text-red-600 ring-red-600/10", Icon: CircleAlert },
  success: { className: "bg-emerald-50 text-emerald-600 ring-emerald-600/10", Icon: CircleCheck },
  neutral: { className: "bg-neutral-100 text-neutral-600 ring-black/[0.06]", Icon: Compass },
};

type StatusPageProps = {
  tone?: StatusTone;
  title: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
  actions?: React.ReactNode;
};

/** Centered single-card page for errors, confirmations and other terminal states. */
export function StatusPage({ tone = "neutral", title, description, children, actions }: StatusPageProps) {
  const { className, Icon } = toneStyles[tone];

  return (
    <div className="relative flex min-h-[100dvh] flex-1 flex-col items-center justify-center px-4 py-10">
      <PageBackground />
      <main className="w-full max-w-md animate-[fadeIn_0.35s_ease-out]">
        <div className="mb-8 flex justify-center">
          <BrandMark size={30} />
        </div>
        <section className={cn("rounded-[20px] p-6 sm:p-8", shellSurface)}>
          <span className={cn("flex h-11 w-11 items-center justify-center rounded-xl ring-1 ring-inset", className)}>
            <Icon aria-hidden className="h-5 w-5" />
          </span>
          <h1 className="mt-5 text-xl font-semibold tracking-tight text-neutral-950">{title}</h1>
          {description ? (
            <div className="mt-2 text-sm leading-relaxed text-neutral-500">{description}</div>
          ) : null}
          {children ? <div className="mt-6">{children}</div> : null}
          {actions ? <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">{actions}</div> : null}
        </section>
      </main>
      <SiteFooter className="mt-8" />
    </div>
  );
}
