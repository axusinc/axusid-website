"use client";

import { useActionState } from "react";
import { SubsectionTitle } from "@/app/account/dashboard-ui";
import {
  disconnectAppAction,
  type ConnectedAppActionState,
} from "@/app/actions/connected-apps";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormError, FormSuccess } from "@/components/ui/form-message";
import { formatPermissionLabel, partitionScopes } from "@/lib/oauth/scopes";
import { cn } from "@/lib/utils";
import { roundedRect } from "@/lib/design";

export type ConnectedApp = {
  grantId: string;
  clientAuid: string;
  clientName: string;
  scopes: string[];
  connectedAt: string;
  lastUsedAt: string | null;
};

const initialState: ConnectedAppActionState = {};

function formatDate(value: string | null): string {
  if (!value) {
    return "never";
  }
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function AppCard({ app }: { app: ConnectedApp }) {
  const [state, formAction, pending] = useActionState(
    disconnectAppAction,
    initialState,
  );
  const { oidcScopes, axusPermissions } = partitionScopes(app.scopes);

  return (
    <div className={cn("border border-black/5 bg-neutral-50/80 p-4", roundedRect)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="block text-sm font-medium text-black">{app.clientName}</span>
          <span className="mt-0.5 block font-mono text-xs text-neutral-500">
            {app.clientAuid}
          </span>
        </div>
        <form action={formAction}>
          <input type="hidden" name="grantId" value={app.grantId} />
          <Button
            type="submit"
            variant="secondary"
            disabled={pending}
            className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            {pending ? "Disconnecting..." : "Disconnect"}
          </Button>
        </form>
      </div>

      <dl className="mt-3 grid gap-1 text-xs text-neutral-500 sm:grid-cols-2">
        <div>
          <dt className="inline">Connected: </dt>
          <dd className="inline text-neutral-700">{formatDate(app.connectedAt)}</dd>
        </div>
        <div>
          <dt className="inline">Last used: </dt>
          <dd className="inline text-neutral-700">{formatDate(app.lastUsedAt)}</dd>
        </div>
      </dl>

      <ul className="mt-3 space-y-1 text-xs text-neutral-600">
        {oidcScopes.map((scope) => (
          <li key={scope}>Sign you in and read your basic profile ({scope})</li>
        ))}
        {axusPermissions.map((permission) => (
          <li key={permission}>{formatPermissionLabel(permission)}</li>
        ))}
      </ul>

      {state.error ? <FormError>{state.error}</FormError> : null}
      {state.success ? <FormSuccess>{state.success}</FormSuccess> : null}
    </div>
  );
}

export function ConnectedAppsSection({ apps }: { apps: ConnectedApp[] }) {
  return (
    <Card>
      <SubsectionTitle
        title="Connected applications"
        description="Applications you have signed in to with AXUS ID. Disconnecting one revokes its access immediately."
      />

      {apps.length === 0 ? (
        <p className="mt-6 text-sm text-neutral-500">
          No applications are connected to your account.
        </p>
      ) : (
        <div className="mt-6 space-y-4">
          {apps.map((app) => (
            <AppCard key={app.grantId} app={app} />
          ))}
        </div>
      )}
    </Card>
  );
}
