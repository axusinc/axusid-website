"use client";

import { useActionState } from "react";
import {
  saveSamlConfigAction,
  deleteSamlConfigAction,
  type SamlActionState,
} from "@/app/developer/saml/actions";
import { SubsectionTitle } from "@/app/account/dashboard-ui";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormError, FormSuccess } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { roundedRect } from "@/lib/design";
import { cn } from "@/lib/utils";

const initialState: SamlActionState = {};

type SamlFormProps = {
  auid: string;
  issuer: string;
  config?: {
    name: string;
    entityId: string;
    acsUrl: string;
    sloUrl?: string | null;
  };
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

export function SamlForm({ auid, issuer, config }: SamlFormProps) {
  const [state, formAction, pending] = useActionState(
    saveSamlConfigAction,
    initialState,
  );

  const idpEntityId = `${issuer}/saml/metadata/${auid}`;
  const idpSsoUrl = `${issuer}/saml/sso/${auid}`;
  const idpSloUrl = `${issuer}/saml/slo/${auid}`;
  const metadataUrl = `${issuer}/saml/metadata/${auid}`;

  return (
    <div className="space-y-8">
      <Card>
        <SubsectionTitle
          title="SAML single sign-on"
          description="AXUS ID acts as the Identity Provider (IdP). Enter your app's Service Provider (SP) details below."
        />

        <form action={formAction} className="mt-6 space-y-5">
          <Input
            name="name"
            label="App name"
            placeholder="My SAML app"
            defaultValue={config?.name}
            required
          />

          <Input
            name="entityId"
            label="SP Entity ID"
            placeholder="https://app.example.com/saml/metadata"
            defaultValue={config?.entityId}
            required
          />

          <Input
            name="acsUrl"
            label="SP Assertion Consumer Service (ACS) URL"
            placeholder="https://app.example.com/saml/acs"
            defaultValue={config?.acsUrl}
            required
          />

          <Input
            name="sloUrl"
            label="SP Single Logout URL (optional)"
            placeholder="https://app.example.com/saml/slo"
            defaultValue={config?.sloUrl || ""}
          />

          {state.error ? <FormError>{state.error}</FormError> : null}
          {state.success ? <FormSuccess>{state.success}</FormSuccess> : null}

          <Button type="submit" variant="brand" className="w-full" disabled={pending}>
            {pending ? "Saving..." : "Save SAML settings"}
          </Button>
        </form>

        {config ? (
          <form action={deleteSamlConfigAction} className="mt-4">
            <Button
              type="submit"
              variant="outline"
              className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              Remove SAML configuration
            </Button>
          </form>
        ) : null}
      </Card>

      <Card>
        <SubsectionTitle
          title="IdP details for your SP"
          description="Copy these into your Service Provider's SAML configuration."
        />

        <div className="mt-6 space-y-4">
          <IdpDetail label="IdP Entity ID (Issuer)" value={idpEntityId} />
          <IdpDetail label="IdP SSO URL" value={idpSsoUrl} />
          <IdpDetail label="IdP SLO URL" value={idpSloUrl} />
          <IdpDetail
            label="NameID format"
            value="urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified"
          />
          <IdpDetail
            label="Metadata URL"
            value={metadataUrl}
            href={`/saml/metadata/${auid}`}
          />
        </div>
      </Card>
    </div>
  );
}
