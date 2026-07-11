"use client";

import { denyConsentAction, consentAction } from "@/app/actions/auth";
import { Avatar } from "@/app/account/dashboard-ui";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { formatPermissionLabel } from "@/lib/oauth/scopes";
import { roundedRect } from "@/lib/design";
import { cn } from "@/lib/utils";

export type ConsentApplicationUserInfo = {
  displayName: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
};

type ConsentFormProps = {
  applicationUser: ConsentApplicationUserInfo | null;
  redirectHost: string | null;
  permissions: string[];
  redirectUri: string;
};

export function ConsentForm({
  applicationUser,
  redirectHost,
  permissions,
  redirectUri,
}: ConsentFormProps) {
  const hasPermissions = permissions.length > 0;
  const fullName = applicationUser
    ? [applicationUser.firstName, applicationUser.lastName].filter(Boolean).join(" ")
    : "";
  const hasDistinctName = Boolean(
    applicationUser &&
      fullName &&
      fullName !== applicationUser.username,
  );

  return (
    <AuthShell
      title="Authorize access"
      description={
        hasPermissions
          ? "Review the application and permissions before continuing."
          : "Confirm that you want to sign in to this application."
      }
    >
      <div className="space-y-6">
        <div
          className={cn(
            "space-y-4 border border-black/5 bg-white/60 p-4 backdrop-blur-sm",
            roundedRect,
          )}
        >
          {applicationUser ? (
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-400">
                Application
              </p>
              <div className="mt-3 flex items-center gap-3">
                <Avatar
                  size="md"
                  firstName={applicationUser.firstName}
                  lastName={applicationUser.lastName}
                  username={applicationUser.username}
                />
                <div className="min-w-0">
                  {hasDistinctName ? (
                    <p className="truncate text-sm font-medium text-neutral-900">
                      {fullName}
                    </p>
                  ) : null}
                  {applicationUser.username ? (
                    <p
                      className={cn(
                        "truncate text-sm text-neutral-700",
                        hasDistinctName
                          ? "text-neutral-500"
                          : "font-medium text-neutral-900",
                      )}
                    >
                      @{applicationUser.username}
                    </p>
                  ) : (
                    <p className="truncate text-sm font-medium text-neutral-900">
                      {applicationUser.displayName}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {redirectHost ? (
            <div
              className={cn(
                applicationUser ? "border-t border-black/5 pt-4" : undefined,
              )}
            >
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-400">
                Redirecting to
              </p>
              <p className="mt-2 truncate text-sm text-neutral-700">
                {redirectHost}
              </p>
            </div>
          ) : null}
        </div>

        {hasPermissions ? (
          <div
            className={cn(
              "border border-black/5 bg-white/60 p-4 backdrop-blur-sm",
              roundedRect,
            )}
          >
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-400">
              Requested permissions
            </p>
            <ul className="mt-3 space-y-2">
              {permissions.map((permission) => (
                <li
                  key={permission}
                  className={cn(
                    "flex items-center justify-between bg-neutral-50/80 px-3 py-2 text-sm text-neutral-700",
                    roundedRect,
                  )}
                >
                  <span>{formatPermissionLabel(permission)}</span>
                  <span className="text-xs uppercase tracking-wide text-neutral-400">
                    allow
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <form action={consentAction} className="space-y-3">
          <input type="hidden" name="redirect_uri" value={redirectUri} />
          <Button type="submit" variant="brand" className="w-full">
            Allow access
          </Button>
        </form>

        <form action={denyConsentAction}>
          <input type="hidden" name="redirect_uri" value={redirectUri} />
          <Button type="submit" variant="outline" className="w-full">
            Deny
          </Button>
        </form>
      </div>
    </AuthShell>
  );
}
