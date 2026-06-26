"use client";

import Link from "next/link";
import {
  deleteClientAction,
  updateClientAction,
  type DeveloperActionState,
} from "@/app/developer/oauth/actions";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { FormError, FormSuccess } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { SUPPORTED_SCOPES, type OAuthClient } from "@/lib/oauth/constants";
import { useActionState } from "react";

const initialState: DeveloperActionState = {};

type EditClientFormProps = {
  client: OAuthClient;
  created?: boolean;
};

export function EditClientForm({ client, created }: EditClientFormProps) {
  const [state, formAction, pending] = useActionState(
    updateClientAction,
    initialState,
  );

  return (
    <AuthShell
      title={client.name}
      description="Manage redirect URIs and allowed scopes for this OAuth client."
    >
      <div className="space-y-6">
        {created ? (
          <FormSuccess>Client created successfully.</FormSuccess>
        ) : null}

        <div className="rounded-xl border border-black/5 bg-neutral-50/80 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.18em] text-neutral-400">
            Client ID
          </p>
          <p className="mt-2 break-all font-mono text-xs text-black">
            {client.clientId}
          </p>
        </div>

        <form action={formAction} className="space-y-5">
          <input type="hidden" name="clientId" value={client.clientId} />
          <Input
            name="name"
            label="App name"
            defaultValue={client.name}
            required
          />
          <label className="block space-y-2">
            <span className="text-sm font-medium text-neutral-700">
              Redirect URIs
            </span>
            <textarea
              name="redirectUris"
              required
              rows={4}
              defaultValue={client.redirectUris.join("\n")}
              className="w-full rounded-xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-black outline-none transition focus:border-black/30"
            />
          </label>

          <fieldset className="space-y-3">
            <legend className="text-sm font-medium text-neutral-700">
              Allowed scopes
            </legend>
            {SUPPORTED_SCOPES.map((scope) => (
              <label
                key={scope}
                className="flex items-center gap-3 rounded-xl border border-black/5 bg-neutral-50/80 px-4 py-3 text-sm text-neutral-700"
              >
                <input
                  type="checkbox"
                  name="allowedScopes"
                  value={scope}
                  defaultChecked={client.allowedScopes.includes(scope)}
                />
                <span>{scope}</span>
              </label>
            ))}
          </fieldset>

          {state.error ? <FormError>{state.error}</FormError> : null}
          {state.success ? <FormSuccess>{state.success}</FormSuccess> : null}

          <Button type="submit" variant="brand" className="w-full" disabled={pending}>
            {pending ? "Saving..." : "Save changes"}
          </Button>
        </form>

        <form action={deleteClientAction}>
          <input type="hidden" name="clientId" value={client.clientId} />
          <Button type="submit" variant="outline" className="w-full">
            Delete client
          </Button>
        </form>

        <Link
          href="/developer/oauth/clients"
          className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-black/10 bg-white px-4 text-sm font-medium text-black transition hover:bg-neutral-50"
        >
          Back to apps
        </Link>
      </div>
    </AuthShell>
  );
}
