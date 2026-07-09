import Link from "next/link";
import { SubsectionTitle } from "@/app/account/dashboard-ui";
import { SamlForm } from "@/app/developer/saml/saml-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { OAuthClient } from "@/lib/oauth/constants";

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
      <Card>
        <SubsectionTitle
          title="OAuth 2.0 clients"
          description="Authorization Code + PKCE. Each client gets a client ID and allowed redirect URIs."
        />

        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-neutral-500">
            {clients.length === 0
              ? "No clients registered yet."
              : `${clients.length} registered client${clients.length === 1 ? "" : "s"}`}
          </p>
          <Link href="/developer/oauth/clients/new">
            <Button type="button" variant="brand">
              Register client
            </Button>
          </Link>
        </div>

        {clients.length > 0 ? (
          <ul className="mt-6 divide-y divide-black/[0.06] border-t border-black/[0.06]">
            {clients.map((client) => (
              <li key={client.clientId}>
                <Link
                  href={`/developer/oauth/clients/${client.clientId}`}
                  className="group flex items-start justify-between gap-4 py-4 transition hover:bg-neutral-50/80 -mx-2 px-2 rounded-lg"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-black group-hover:underline">
                      {client.name}
                    </p>
                    <p className="mt-1 text-xs text-neutral-500">
                      Client ID
                    </p>
                    <p className="mt-0.5 break-all font-mono text-xs text-neutral-600">
                      {client.clientId}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-600">
                    {client.redirectUris.length} redirect URI
                    {client.redirectUris.length === 1 ? "" : "s"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </Card>

      <SamlForm auid={auid} issuer={issuer} config={samlConfig} />
    </div>
  );
}
