"use client";

import { useActionState } from "react";
import { AtSign, CalendarDays, Clock3, IdCard, KeyRound, RefreshCw, UserRound } from "lucide-react";
import { SubsectionTitle } from "@/app/account/dashboard-ui";
import {
  disconnectAppAction,
  type ConnectedAppActionState,
} from "@/app/actions/connected-apps";
import { AppRequestCard, type RequestingAppInfo } from "@/components/app-request-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormError, FormSuccess } from "@/components/ui/form-message";
import { formatPermissionLabel, partitionScopes } from "@/lib/oauth/scopes";
import { cn } from "@/lib/utils";
import { roundedRect } from "@/lib/design";

export type ConnectedApp = {
  grantId: string;
  application: RequestingAppInfo;
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

const accessByScope = {
  openid: { label: "Your AXUS ID identifier", Icon: IdCard },
  profile: { label: "Your name and username", Icon: UserRound },
  email: { label: "Your AXUS email address", Icon: AtSign },
  offline_access: { label: "Stay signed in when you’re not using the app", Icon: RefreshCw },
} as const;

function AppCard({ app }: { app: ConnectedApp }) {
  const [state, formAction, pending] = useActionState(
    disconnectAppAction,
    initialState,
  );
  const { oidcScopes, axusPermissions } = partitionScopes(app.scopes);
  const standardAccess = oidcScopes
    .map((scope) => accessByScope[scope as keyof typeof accessByScope])
    .filter((item): item is (typeof accessByScope)[keyof typeof accessByScope] => Boolean(item));

  return (
    <article className={cn("overflow-hidden border border-black/[0.07] bg-white", roundedRect)}>
      <div className="flex items-center justify-between gap-4 p-4 sm:p-5">
        <AppRequestCard
          app={app.application}
          appName={app.application.displayName}
          className="min-w-0 flex-1 border-0 bg-transparent p-0 pr-0 shadow-none"
        />
        <form action={formAction}>
          <input type="hidden" name="grantId" value={app.grantId} />
          <Button
            type="submit"
            size="sm"
            variant="danger-ghost"
            disabled={pending}
          >
            {pending ? "Disconnecting…" : "Disconnect"}
          </Button>
        </form>
      </div>

      <div className="border-t border-black/[0.05] bg-neutral-50/70 px-4 py-4 sm:px-5">
        <dl className="grid gap-2 text-xs text-neutral-500 sm:grid-cols-2 sm:gap-4">
          <div className="flex items-center gap-2">
            <CalendarDays aria-hidden className="h-3.5 w-3.5 text-neutral-400" />
            <dt>Connected</dt>
            <dd className="font-medium text-neutral-700">
              <time dateTime={app.connectedAt}>{formatDate(app.connectedAt)}</time>
            </dd>
          </div>
          <div className="flex items-center gap-2">
            <Clock3 aria-hidden className="h-3.5 w-3.5 text-neutral-400" />
            <dt>Last used</dt>
            <dd className="font-medium text-neutral-700">
              {app.lastUsedAt ? (
                <time dateTime={app.lastUsedAt}>{formatDate(app.lastUsedAt)}</time>
              ) : (
                "Never"
              )}
            </dd>
          </div>
        </dl>

        <div className="mt-4 border-t border-black/[0.05] pt-4">
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-neutral-500">
            Access granted
          </p>
          <ul className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
            {standardAccess.map(({ label, Icon }) => (
              <li key={label} className="flex items-center gap-2.5 text-sm text-neutral-700">
                <Icon aria-hidden className="h-4 w-4 shrink-0 text-neutral-400" />
                <span>{label}</span>
              </li>
            ))}
            {axusPermissions.map((permission) => (
              <li key={permission} className="flex items-center gap-2.5 text-sm text-neutral-700">
                <KeyRound aria-hidden className="h-4 w-4 shrink-0 text-brand" />
                <span>{formatPermissionLabel(permission)}</span>
              </li>
            ))}
          </ul>
        </div>

        {state.error ? <FormError>{state.error}</FormError> : null}
        {state.success ? <FormSuccess>{state.success}</FormSuccess> : null}
      </div>
    </article>
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
