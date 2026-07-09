import Link from "next/link";
import { requireDeveloperSession } from "@/lib/oauth/developer";
import { getSamlConfigByAuid } from "@/lib/saml/saml-store";
import { getIssuer } from "@/lib/oauth/constants";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { SamlForm } from "./saml-form";

export default async function DeveloperSamlPage() {
  const session = await requireDeveloperSession();
  const config = await getSamlConfigByAuid(session.auid);
  const issuer = getIssuer();

  return (
    <div className="relative min-h-full overflow-hidden bg-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,0,0,0.04),transparent_55%),linear-gradient(180deg,#ffffff_0%,#f5f5f5_100%)]" />

      <header className="relative border-b border-black/5 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <Link href="/developer/oauth/clients" className="flex items-center gap-3">
              <Logo size={36} />
            </Link>
            <p className="text-sm font-medium text-black">Developer Settings</p>
          </div>
          <div className="flex gap-2">
            <Link href="/developer/oauth/clients">
              <Button type="button" variant="outline">
                OAuth clients
              </Button>
            </Link>
            <Link href="/account">
              <Button type="button" variant="outline">
                Account
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-2xl px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-black">
            SAML Single Sign-On Settings
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            Set up AXUS ID as a SAML Identity Provider (IdP) for your service.
          </p>
        </div>

        <SamlForm auid={session.auid} issuer={issuer} config={config} />
      </main>
    </div>
  );
}
