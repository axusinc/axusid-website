"use client";

import { useActionState } from "react";
import {
  saveSamlConfigAction,
  deleteSamlConfigAction,
  type SamlActionState,
} from "@/app/developer/saml/actions";
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

export function SamlForm({ auid, issuer, config }: SamlFormProps) {
  const [state, formAction, pending] = useActionState(
    saveSamlConfigAction,
    initialState,
  );

  const idpEntityId = `${issuer}/saml/metadata/${auid}`;
  const idpSsoUrl = `${issuer}/saml/sso/${auid}`;

  return (
    <div className="space-y-8">
      <Card className="p-6 sm:p-8">
        <h2 className="text-xl font-semibold text-black">
          SAML Service Provider Configuration
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          Configure the external Service Provider (SP) that users will log in to.
        </p>

        <form action={formAction} className="mt-6 space-y-5">
          <Input
            name="name"
            label="App Name"
            placeholder="My SAML App"
            defaultValue={config?.name}
            required
          />

          <Input
            name="entityId"
            label="SP Entity ID (Audience)"
            placeholder="https://app.example.com/saml/metadata"
            defaultValue={config?.entityId}
            required
          />

          <Input
            name="acsUrl"
            label="Assertion Consumer Service (ACS) URL"
            placeholder="https://app.example.com/saml/acs"
            defaultValue={config?.acsUrl}
            required
          />

          <Input
            name="sloUrl"
            label="Single Logout (SLO) URL (Optional)"
            placeholder="https://app.example.com/saml/slo"
            defaultValue={config?.sloUrl || ""}
          />

          {state.error ? <FormError>{state.error}</FormError> : null}
          {state.success ? <FormSuccess>{state.success}</FormSuccess> : null}

          <div className="flex gap-4 pt-2">
            <Button type="submit" variant="brand" className="flex-1" disabled={pending}>
              {pending ? "Saving..." : "Save SAML Settings"}
            </Button>
          </div>
        </form>

        {config ? (
          <form action={deleteSamlConfigAction} className="mt-4">
            <Button
              type="submit"
              variant="outline"
              className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
            >
              Delete SAML Configuration
            </Button>
          </form>
        ) : null}
      </Card>

      <Card className="p-6 sm:p-8">
        <h2 className="text-xl font-semibold text-black">
          Identity Provider (IdP) Configuration Details
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          Use these values to configure SAML SSO in your external Service Provider application.
        </p>

        <div className="mt-6 space-y-4">
          <div className={cn("border border-black/5 bg-neutral-50/80 px-4 py-3", roundedRect)}>
            <span className="text-xs uppercase tracking-[0.18em] text-neutral-400 font-medium block">
              IdP Entity ID (Issuer)
            </span>
            <span className="mt-1 block break-all font-mono text-xs text-black select-all">
              {idpEntityId}
            </span>
          </div>

          <div className={cn("border border-black/5 bg-neutral-50/80 px-4 py-3", roundedRect)}>
            <span className="text-xs uppercase tracking-[0.18em] text-neutral-400 font-medium block">
              IdP Single Sign-On (SSO) URL
            </span>
            <span className="mt-1 block break-all font-mono text-xs text-black select-all">
              {idpSsoUrl}
            </span>
          </div>

          <div className={cn("border border-black/5 bg-neutral-50/80 px-4 py-3", roundedRect)}>
            <span className="text-xs uppercase tracking-[0.18em] text-neutral-400 font-medium block">
              IdP Single Logout (SLO) URL
            </span>
            <span className="mt-1 block break-all font-mono text-xs text-black select-all">
              {issuer}/saml/slo/{auid}
            </span>
          </div>

          <div className={cn("border border-black/5 bg-neutral-50/80 px-4 py-3", roundedRect)}>
            <span className="text-xs uppercase tracking-[0.18em] text-neutral-400 font-medium block">
              NameID Format
            </span>
            <span className="mt-1 block break-all font-mono text-xs text-black select-all">
              urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified
            </span>
          </div>

          <div className={cn("border border-black/5 bg-neutral-50/80 px-4 py-3", roundedRect)}>
            <span className="text-xs uppercase tracking-[0.18em] text-neutral-400 font-medium block">
              Metadata XML Endpoint
            </span>
            <a
              href={`/saml/metadata/${auid}`}
              target="_blank"
              rel="noreferrer"
              className="mt-1 block break-all font-mono text-xs text-brand hover:underline"
            >
              {idpEntityId}
            </a>
          </div>
        </div>
      </Card>
    </div>
  );
}
