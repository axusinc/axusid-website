import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { BrandMark, SiteFooter } from "@/components/brand-mark";
import { PageBackground } from "@/components/page-background";
import { AxusIdButton } from "@/components/ui/axusid-button";
import { GoogleButton } from "@/components/ui/google-button";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Button and brand",
  description:
    "How to render the Continue with AXUS ID button next to Google: labels, sizing, spacing and what not to change.",
};

export default function BrandPage() {
  return (
    <div className="relative flex min-h-[100dvh] flex-1 flex-col">
      <PageBackground />
      <header className="mx-auto flex h-16 w-full max-w-4xl items-center justify-between gap-4 px-4 sm:h-20 sm:px-6">
        <BrandMark size={30} />
        <nav className="flex items-center gap-2" aria-label="Main">
          <Link href="/developers/quickstart" className={buttonVariants({ variant: "ghost", size: "md" })}>
            Quickstart
          </Link>
          <Link href="/account?section=developer" className={buttonVariants({ size: "md" })}>
            Register your app
          </Link>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 pb-24 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">Brand</p>
        <h1 className="mt-3 max-w-2xl text-balance text-3xl font-semibold tracking-[-0.03em] text-neutral-950 sm:text-4xl">
          The AXUS ID button.
        </h1>
        <p className="mt-4 max-w-2xl text-pretty text-[15px] leading-relaxed text-neutral-500 sm:text-base">
          Use it in the same group as your other login buttons, at the same height.
          Don’t restyle it to match your theme — users need to recognise it across apps.
        </p>

        <section aria-labelledby="themes" className="mt-10 rounded-[20px] border border-black/[0.07] bg-white p-6 sm:p-8">
          <h2 id="themes" className="text-xl font-semibold tracking-tight text-neutral-950">
            Finishes
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-neutral-500">
            White or black on light surfaces — white pairs with the Google button. Grey or
            black on dark surfaces. Same 18px mark and label on all of them.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2.5 rounded-2xl border border-black/[0.06] bg-neutral-50 p-4">
              <p className="text-xs font-medium text-neutral-500">Light surfaces</p>
              <AxusIdButton href="/developers/quickstart" tone="white" />
              <AxusIdButton href="/developers/quickstart" tone="black" />
            </div>
            <div className="space-y-2.5 rounded-2xl bg-neutral-950 p-4">
              <p className="text-xs font-medium text-neutral-400">Dark surfaces</p>
              <AxusIdButton href="/developers/quickstart" tone="grey" />
              <AxusIdButton href="/developers/quickstart" tone="black" />
            </div>
          </div>
        </section>

        <section aria-labelledby="labels" className="mt-6 rounded-[20px] border border-black/[0.07] bg-white p-6 sm:p-8">
          <h2 id="labels" className="text-xl font-semibold tracking-tight text-neutral-950">
            Labels
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-neutral-500">
            Use <strong className="font-semibold text-neutral-800">Continue with AXUS ID</strong> for
            sign-in and sign-up on the same screen. <strong className="font-semibold text-neutral-800">Sign in
            with AXUS ID</strong> is acceptable when the screen is sign-in only. Don’t write “AXUS”,
            “AxusID”, or “Login with AXUS”.
          </p>
          <div className="mt-5 grid max-w-md gap-2.5">
            <AxusIdButton href="/developers/quickstart" />
            <AxusIdButton href="/developers/quickstart" label="Sign in with AXUS ID" />
          </div>
        </section>

        <section aria-labelledby="placement" className="mt-6 rounded-[20px] border border-black/[0.07] bg-white p-6 sm:p-8">
          <h2 id="placement" className="text-xl font-semibold tracking-tight text-neutral-950">
            Placement next to Google
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-neutral-500">
            Same width, same height, 10px gap next to the other login buttons — Google,
            Apple, GitHub, whatever the app already offers. Either order is fine — don’t push
            AXUS ID into a “more options” menu while the others stay visible.
          </p>
          <div className="mt-5 grid max-w-md gap-2.5">
            <GoogleButton href="/developers/quickstart#alongside-google" />
            <AxusIdButton href="/developers/quickstart#alongside-google" />
          </div>
        </section>

        <section aria-labelledby="assets" className="mt-6 rounded-[20px] border border-black/[0.07] bg-white p-6 sm:p-8">
          <h2 id="assets" className="text-xl font-semibold tracking-tight text-neutral-950">
            Mark
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-neutral-500">
            Inside the button the symbol ships without the TM — at 18px the TM is unreadable
            and only shrinks the symbol next to the Google “G”. The TM lockups{" "}
            <code className="font-mono text-[13px] text-neutral-800">/icon-tm.png</code> (light
            surfaces) and <code className="font-mono text-[13px] text-neutral-800">/icon-tm-dark.png</code>{" "}
            (dark surfaces) are for 28px and up. Minimum clear space is half the mark on all sides.
            Don’t rotate, recolor, add shadows, or set it on a photo.
          </p>
          <div className="mt-5 flex items-center gap-6">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-black/10 bg-white">
              <Image src="/axus-mark.png" alt="AXUS mark without TM, as used in the button" width={869} height={905} className="h-[28px] w-auto" />
            </span>
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-950">
              <Image src="/axus-mark.png" alt="" aria-hidden width={869} height={905} className="h-[28px] w-auto" />
            </span>
          </div>
        </section>

        <section aria-labelledby="donts" className="mt-6 rounded-[20px] border border-black/[0.07] bg-white p-6 sm:p-8">
          <h2 id="donts" className="text-xl font-semibold tracking-tight text-neutral-950">
            Don’t
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-neutral-600">
            <li>Don’t change the button color, radius, or font to fit your theme.</li>
            <li>Don’t ask for AXUS ID credentials on your own screens — always use the hosted authorize page.</li>
            <li>Don’t request <code className="font-mono text-[13px] text-neutral-800">offline_access</code> unless you refresh tokens server-side.</li>
          </ul>
          <div className="mt-6">
            <Link href="/developers/quickstart" className={buttonVariants({ className: "gap-2" })}>
              Go to the quickstart
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter className="pb-10" />
    </div>
  );
}
