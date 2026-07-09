import Link from "next/link";
import { PanelHeader } from "@/app/account/dashboard-ui";
import { SamlForm } from "@/app/developer/saml/saml-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cardSurface, roundedRect } from "@/lib/design";
import type { OAuthClient } from "@/lib/oauth/constants";
import { cn } from "@/lib/utils";

type SamlConfig = {
  name: string;
  entityId: string;
  acsUrl: string;
  sloUrl?: string | null;
};

type DeveloperSectionProps = {
  auid: string;
  issuer: string;
  clients: OAuthClient[];
  samlConfig?: SamlConfig;
};

export function DeveloperSection({
  auid,
  issuer,
  clients,
  samlConfig,
}: DeveloperSectionProps) {
  return (
    <div className="space-y-8">
      <Card className="p-6 sm:p-8">
        <PanelHeader
          title="OAuth clients"
          subtitle="Register redirect URIs so other applications can sign users in with AXUS ID."
          action={
            <Link href="/developer/oauth/clients/new">
              <Button type="button" variant="brand" className="h-8 px-3">
                Register app
              </Button>
            </Link>
          }
        />

        <div className="mt-6 space-y-4">
          {clients.length === 0 ? (
            <div
              className={cn(
                cardSurface,
                roundedRect,
                "p-6 text-sm text-neutral-500",
              )}
            >
              No apps registered yet.
            </div>
          ) : (
            clients.map((client) => (
              <Link
                key={client.clientId}
                href={`/developer/oauth/clients/${client.clientId}`}
                className={cn(
                  "block p-6 transition hover:border-black/10",
                  cardSurface,
                  roundedRect,
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-medium text-black">{client.name}</h3>
                    <p className="mt-2 break-all font-mono text-xs text-neutral-500">
                      {client.clientId}
                    </p>
                  </div>
                  <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-600">
                    {client.redirectUris.length} redirect URI
                    {client.redirectUris.length === 1 ? "" : "s"}
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
      </Card>

      <SamlForm auid={auid} issuer={issuer} config={samlConfig} />
    </div>
  );
}
