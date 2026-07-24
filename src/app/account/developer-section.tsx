"use client";

import { useActionState } from "react";
import { SubsectionTitle } from "@/app/account/dashboard-ui";
import { SamlForm } from "@/app/developer/saml/saml-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormError, FormSuccess } from "@/components/ui/form-message";
import {
  saveOauthConfigAction,
  deleteClientAction,
  type DeveloperActionState,
} from "@/app/developer/oauth/actions";
import { type OAuthClient } from "@/lib/oauth/constants";
import { cn } from "@/lib/utils";
import { roundedRect } from "@/lib/design";

const initialState: DeveloperActionState = {};

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

function IdpDetail({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href?: string;
}) {
  return (
    <div className={cn("border border-black/5 bg-neutral-50/80 px-4 py-3", roundedRect)}>
      <span className="block text-xs font-medium uppercase tracking-[0.18em] text-neutral-400">
        {label}
      </span>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="mt-1 block break-all font-mono text-xs text-black hover:underline"
        >
          {value}
        </a>
      ) : (
        <span className="mt-1 block break-all font-mono text-xs text-black select-all">
          {value}
        </span>
      )}
    </div>
  );
}

export function DeveloperSection({
  auid,
  issuer,
  clients,
  samlConfig,
}: DeveloperSectionProps) {
  const [state, formAction, pending] = useActionState(
    saveOauthConfigAction,
    initialState,
  );

  const client = clients[0];

  return (
    <div className="space-y-8">
      <Card>
        <SubsectionTitle
          title="OAuth 2.0 client settings"
          description="Configure redirect URIs for your OAuth client (1 user = 1 client)."
        />

        <form action={formAction} className="mt-6 space-y-5">

          <label className="block space-y-2">
            <span className="text-sm font-medium text-neutral-700">
              Redirect URIs (one per line)
            </span>
            <textarea
              name="redirectUris"
              required
              rows={4}
              defaultValue={client?.redirectUris.join("\n") || ""}
              placeholder="http://localhost:3000/callback"
              className={cn("w-full border border-black/10 bg-white/80 px-4 py-3 text-sm text-black outline-none transition focus:border-black/30", roundedRect)}
            />
          </label>

          {state.error ? <FormError>{state.error}</FormError> : null}
          {state.success ? <FormSuccess>{state.success}</FormSuccess> : null}

          <Button type="submit" variant="brand" className="w-full" disabled={pending}>
            {pending ? "Saving..." : "Save OAuth settings"}
          </Button>
        </form>

        {client ? (
          <form action={deleteClientAction} className="mt-4">
            <Button
              type="submit"
              variant="outline"
              className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              Remove OAuth configuration
            </Button>
          </form>
        ) : null}
      </Card>

      <Card>
        <SubsectionTitle
          title="OAuth 2.0 integration details"
          description="Copy these parameters to integrate external services using your user account."
        />

        <div className="mt-6 space-y-4">
          <IdpDetail label="Client ID (Your AUID)" value={auid} />
          <IdpDetail label="Authorization endpoint" value={`${issuer}/authorize`} />
          <IdpDetail label="Token endpoint" value={`${issuer}/oauth/token`} />
          <IdpDetail label="Userinfo endpoint" value={`${issuer}/oauth/userinfo`} />
          <IdpDetail
            label="JWKS URI"
            value={`${issuer}/.well-known/jwks.json`}
            href={`${issuer}/.well-known/jwks.json`}
          />
        </div>
      </Card>

      <SamlForm auid={auid} issuer={issuer} config={samlConfig} />
    </div>
  );
}
