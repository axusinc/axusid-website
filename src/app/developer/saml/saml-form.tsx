"use client";

import { FileKey2 } from "lucide-react";
import { useActionState } from "react";
import {
  saveSamlConfigAction,
  deleteSamlConfigAction,
  type SamlActionState,
} from "@/app/developer/saml/actions";
import { SubsectionTitle } from "@/app/account/dashboard-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { CopyField } from "@/components/ui/copy-field";
import { FormError, FormSuccess } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";

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
    <Card>
      <CardHeader
        icon={<FileKey2 aria-hidden />}
        title="SAML 2.0"
        description="AXUS ID acts as the identity provider (IdP). Enter your service provider (SP) details."
        badge={
          config ? (
            <Badge tone="success" dot>
              Active
            </Badge>
          ) : (
            <Badge>Not configured</Badge>
          )
        }
      />

      <form action={formAction} className="mt-6 space-y-4 border-t border-black/[0.05] pt-6">
        <Input
          id="saml-entity-id"
          name="entityId"
          label="SP entity ID"
          placeholder="https://app.example.com/saml/metadata"
          defaultValue={config?.entityId}
          className="font-mono text-[13px]"
          spellCheck={false}
          required
        />

        <Input
          id="saml-acs-url"
          name="acsUrl"
          label="Assertion Consumer Service (ACS) URL"
          placeholder="https://app.example.com/saml/acs"
          defaultValue={config?.acsUrl}
          className="font-mono text-[13px]"
          spellCheck={false}
          required
        />

        <Input
          id="saml-slo-url"
          name="sloUrl"
          label="Single logout URL"
          hint="Optional."
          placeholder="https://app.example.com/saml/slo"
          defaultValue={config?.sloUrl || ""}
          className="font-mono text-[13px]"
          spellCheck={false}
        />

        {state.error ? <FormError>{state.error}</FormError> : null}
        {state.success ? <FormSuccess>{state.success}</FormSuccess> : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button type="submit" size="md" loading={pending}>
            {pending ? "Saving…" : config ? "Save changes" : "Enable SAML"}
          </Button>
          {config ? (
            <ConfirmButton confirmLabel="Remove SAML" submitForm="delete-saml-config" size="md">
              Remove SAML
            </ConfirmButton>
          ) : null}
        </div>
      </form>
      {config ? <form id="delete-saml-config" action={deleteSamlConfigAction} hidden /> : null}

      <div className="mt-6 border-t border-black/[0.05] pt-6">
        <SubsectionTitle
          title="Identity provider details"
          description="Copy these into your service provider’s SAML configuration."
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <CopyField label="Metadata URL" value={metadataUrl} />
          <CopyField label="IdP entity ID (issuer)" value={idpEntityId} />
          <CopyField label="SSO URL" value={idpSsoUrl} />
          <CopyField label="SLO URL" value={idpSloUrl} />
          <CopyField
            label="NameID format"
            value="urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified"
            className="sm:col-span-2"
          />
        </div>
      </div>
    </Card>
  );
}
