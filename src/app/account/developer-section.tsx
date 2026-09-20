"use client";

import { Code2 } from "lucide-react";
import { useActionState } from "react";
import { SubsectionTitle } from "@/app/account/dashboard-ui";
import { SamlForm } from "@/app/developer/saml/saml-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { CopyField } from "@/components/ui/copy-field";
import { FormError, FormSuccess } from "@/components/ui/form-message";
import { Textarea } from "@/components/ui/input";
import {
  saveOauthConfigAction,
  deleteClientAction,
  type DeveloperActionState,
} from "@/app/developer/oauth/actions";
import { type OAuthClient } from "@/lib/oauth/constants";

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
    <div className="space-y-5">
      <Card>
        <CardHeader
          icon={<Code2 aria-hidden />}
          title="OAuth 2.0 / OpenID Connect"
          description="Each account can register one OAuth client. Its client ID is your AUID."
          badge={
            client ? (
              <Badge tone="success" dot>
                Active
              </Badge>
            ) : (
              <Badge>Not configured</Badge>
            )
          }
        />

        <form action={formAction} className="mt-6 space-y-4 border-t border-black/[0.05] pt-6">
          <Textarea
            id="oauth-redirect-uris"
            name="redirectUris"
            label="Redirect URIs"
            hint="One per line. Users are only ever sent back to these exact addresses."
            required
            rows={4}
            defaultValue={client?.redirectUris.join("\n") || ""}
            placeholder={"https://app.example.com/auth/callback\nhttp://localhost:3000/callback"}
            className="font-mono text-[13px]"
            spellCheck={false}
          />

          {state.error ? <FormError>{state.error}</FormError> : null}
          {state.success ? <FormSuccess>{state.success}</FormSuccess> : null}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button type="submit" size="md" loading={pending}>
              {pending ? "Saving…" : client ? "Save changes" : "Create OAuth client"}
            </Button>
            {client ? (
              <ConfirmButton confirmLabel="Delete client" submitForm="delete-oauth-client" size="md">
                Delete client
              </ConfirmButton>
            ) : null}
          </div>
        </form>
        {client ? <form id="delete-oauth-client" action={deleteClientAction} hidden /> : null}

        <div className="mt-6 border-t border-black/[0.05] pt-6">
          <SubsectionTitle
            title="Integration details"
            description="Use these values in your application’s OAuth / OIDC library."
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <CopyField label="Client ID" value={auid} />
            <CopyField label="Issuer" value={issuer} />
            <CopyField label="Discovery document" value={`${issuer}/.well-known/openid-configuration`} />
            <CopyField label="Authorization endpoint" value={`${issuer}/authorize`} />
            <CopyField label="Token endpoint" value={`${issuer}/oauth/token`} />
            <CopyField label="Userinfo endpoint" value={`${issuer}/oauth/userinfo`} />
            <CopyField label="JWKS URI" value={`${issuer}/.well-known/jwks.json`} />
          </div>
        </div>
      </Card>

      <SamlForm auid={auid} issuer={issuer} config={samlConfig} />
    </div>
  );
}
