"use client";

import Link from "next/link";
import {
  createClientAction,
  type DeveloperActionState,
} from "@/app/developer/oauth/actions";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { SUPPORTED_SCOPES } from "@/lib/oauth/constants";
import { useActionState } from "react";

const initialState: DeveloperActionState = {};

export function ClientForm() {
  const [state, formAction, pending] = useActionState(
    createClientAction,
    initialState,
  );

  return (
    <AuthShell
      title="Register an app"
      description="Create an OAuth client for your application."
    >
      <form action={formAction} className="space-y-5">
        <Input name="name" label="App name" placeholder="My Application" required />
        <label className="block space-y-2">
          <span className="text-sm font-medium text-neutral-700">
            Redirect URIs
          </span>
          <textarea
            name="redirectUris"
            required
            rows={4}
            placeholder={"http://localhost:3001/callback\nhttps://app.example.com/callback"}
            className="w-full rounded-xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-black outline-none transition focus:border-black/30"
          />
          <span className="block text-xs text-neutral-500">
            One URI per line. Production URIs must use HTTPS except localhost.
          </span>
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
                defaultChecked={scope === "openid" || scope === "profile"}
              />
              <span>{scope}</span>
            </label>
          ))}
        </fieldset>

        {state.error ? <FormError>{state.error}</FormError> : null}

        <Button type="submit" variant="brand" className="w-full" disabled={pending}>
          {pending ? "Creating..." : "Create client"}
        </Button>
        <Link
          href="/developer/oauth/clients"
          className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-black/10 bg-white px-4 text-sm font-medium text-black transition hover:bg-neutral-50"
        >
          Cancel
        </Link>
      </form>
    </AuthShell>
  );
}
