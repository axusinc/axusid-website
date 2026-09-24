import Link from "next/link";
import { BrandMark, SiteFooter } from "@/components/brand-mark";
import { PageBackground } from "@/components/page-background";

export function LegalPage({
  eyebrow,
  title,
  updated,
  children,
}: {
  eyebrow: string;
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-[100dvh] flex-1 flex-col">
      <PageBackground />
      <header className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between gap-4 px-4 sm:h-20 sm:px-6">
        <BrandMark size={30} />
        <Link
          href="/"
          className="text-sm font-medium text-neutral-800 underline underline-offset-4 hover:text-neutral-950"
        >
          Home
        </Link>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-24 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">{eyebrow}</p>
        <h1 className="mt-3 text-balance text-3xl font-semibold tracking-[-0.03em] text-neutral-950 sm:text-4xl">
          {title}
        </h1>
        <p className="mt-3 text-[13px] text-neutral-400">Last updated: {updated}</p>
        <div className="mt-8 space-y-8 rounded-[20px] border border-black/[0.07] bg-white p-6 sm:p-10">
          {children}
        </div>
      </main>

      <SiteFooter className="pb-10" />
    </div>
  );
}

export function LegalSection({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="scroll-mt-8 text-lg font-semibold tracking-tight text-neutral-950">
        {title}
      </h2>
      <div className="mt-2 space-y-3 text-sm leading-relaxed text-neutral-600">{children}</div>
    </section>
  );
}

export function LegalList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
