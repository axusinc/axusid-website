"use client";

import Link from "next/link";
import { Check, ShieldCheck } from "lucide-react";
import { denyConsentAction, consentAction } from "@/app/actions/auth";
import { Avatar } from "@/app/account/dashboard-ui";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { formatPermissionLabel } from "@/lib/oauth/scopes";
import { roundedRect } from "@/lib/design";
import { cn } from "@/lib/utils";
import type { AccountItemInfo } from "@/lib/user-profile";

export type ConsentApplicationUserInfo = {
  displayName: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
};

type ConsentFormProps = {
  applicationUser: ConsentApplicationUserInfo | null;
  redirectHost?: string | null;
  permissions: string[];
  redirectUri: string;
  accounts?: AccountItemInfo[];
  currentAuid?: string;
};

function renderIdentityHeading(
  displayName: string,
  username: string | null | undefined,
  firstName?: string | null,
  lastName?: string | null,
) {
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
  const effectiveDisplay = fullName || displayName;
  const normUsername = username?.trim().replace(/^@/, "");
  const normDisplay = effectiveDisplay?.trim().replace(/^@/, "");
  const hasDistinctName = Boolean(
    normUsername &&
      normDisplay &&
      normDisplay.toLowerCase() !== normUsername.toLowerCase(),
  );

  if (hasDistinctName) {
    return (
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-black">{effectiveDisplay}</p>
        <p className="truncate text-xs text-neutral-500">@{normUsername}</p>
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <p className="truncate text-sm font-semibold text-black">
        {normUsername ? `@${normUsername}` : effectiveDisplay}
      </p>
    </div>
  );
}

function renderAppIdentityHeading(
  applicationUser: ConsentApplicationUserInfo | null,
  appName: string,
) {
  if (!applicationUser) {
    return <p className="truncate text-lg font-semibold tracking-tight text-black">{appName}</p>;
  }

  const fullName = [applicationUser.firstName, applicationUser.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  const effectiveDisplay = fullName || applicationUser.displayName || appName;
  const normUsername = applicationUser.username?.trim().replace(/^@/, "");
  const normDisplay = effectiveDisplay?.trim().replace(/^@/, "");
  const hasDistinctName = Boolean(
    normUsername &&
      normDisplay &&
      normDisplay.toLowerCase() !== normUsername.toLowerCase(),
  );

  if (hasDistinctName) {
    return (
      <div>
        <p className="truncate text-lg font-semibold tracking-tight text-black">{effectiveDisplay}</p>
        <p className="truncate text-xs text-neutral-500">@{normUsername}</p>
      </div>
    );
  }

  return (
    <p className="truncate text-lg font-semibold tracking-tight text-black">
      {normUsername ? `@${normUsername}` : effectiveDisplay}
    </p>
  );
}

function buildChangeAccountHref(redirectUri: string): string {
  let cleanRedirect = redirectUri;
  try {
    const url = new URL(redirectUri, "http://localhost");
    url.searchParams.delete("account_selected");
    cleanRedirect = `${url.pathname}${url.search}`;
  } catch {
    // fallback
  }

  const params = new URLSearchParams();
  params.set("redirect_uri", cleanRedirect);
  params.set("select_account", "true");
  return `/login?${params.toString()}`;
}

export function ConsentForm({
  applicationUser,
  permissions,
  redirectUri,
  accounts = [],
  currentAuid = "",
}: ConsentFormProps) {
  const activeAccount =
    accounts.find((a) => a.auid === currentAuid) ||
    accounts.find((a) => a.isActive) ||
    accounts[0];

  const appName = applicationUser?.displayName || "Application";
  const hasCustomPermissions = permissions.length > 0;
  const changeAccountHref = buildChangeAccountHref(redirectUri);

  const title = hasCustomPermissions
    ? applicationUser
      ? `${appName} wants access`
      : "Confirm access"
    : `Sign in to ${appName}`;

  const description = hasCustomPermissions
    ? `Review requested permissions for your account before signing in.`
    : `Confirm your identity to finish signing in to ${appName}.`;

  return (
    <AuthShell
      variant="sign-in"
      signInStep={2}
      maxWidthClass="max-w-[920px]"
      title={title}
      description={description}
    >
      <div className="space-y-6">
        {/* Active Account Card with Change link back to Step 1 */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Signing in as
          </p>

          {activeAccount ? (
            <div
              className={cn(
                "flex items-center justify-between border border-black/10 bg-neutral-50/90 px-4 py-3 shadow-xs",
                roundedRect,
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Avatar
                  firstName={activeAccount.firstName}
                  lastName={activeAccount.lastName}
                  username={activeAccount.username}
                  size="md"
                  className="ring-2 ring-black/[0.04]"
                />
                {renderIdentityHeading(
                  activeAccount.displayName,
                  activeAccount.username,
                  activeAccount.firstName,
                  activeAccount.lastName,
                )}
              </div>

              <Link
                href={changeAccountHref}
                className="text-xs font-semibold text-neutral-600 transition-colors hover:text-black hover:underline"
              >
                Change
              </Link>
            </div>
          ) : null}
        </div>

        {/* Application Details / Permissions Box */}
        <div
          className={cn(
            "space-y-4 border border-black/10 bg-white/70 p-5 backdrop-blur-sm shadow-xs",
            roundedRect,
          )}
        >
          {/* Target App Identity */}
          <div className="flex items-center gap-3.5">
            <Avatar
              size="md"
              firstName={applicationUser?.firstName ?? null}
              lastName={applicationUser?.lastName ?? null}
              username={applicationUser?.username ?? null}
              className="h-11 w-11 text-sm font-bold shadow-xs ring-2 ring-black/5"
            />
            <div className="min-w-0 flex-1">
              {renderAppIdentityHeading(applicationUser, appName)}
              <p className="mt-1 text-sm leading-relaxed text-neutral-500">
                {hasCustomPermissions
                  ? "Wants to access your AXUS account with the permissions below."
                  : "Wants you to sign in with your AXUS ID."}
              </p>
            </div>
          </div>

          {/* Custom Permission Items List (only shown if custom permissions exist) */}
          {hasCustomPermissions ? (
            <div className="pt-3 border-t border-black/[0.06] space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-neutral-500" />
                  Requested permissions
                </p>
                <span className="text-[11px] text-neutral-400">
                  {permissions.length} {permissions.length === 1 ? "item" : "items"}
                </span>
              </div>

              <ul className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {permissions.map((perm) => (
                  <li
                    key={perm}
                    className={cn(
                      "flex items-start justify-between bg-neutral-50/80 px-3.5 py-2.5 text-sm text-neutral-800 border border-black/[0.06]",
                      roundedRect,
                    )}
                  >
                    <div className="flex items-start gap-2.5 min-w-0 pr-2">
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                        <Check className="h-2.5 w-2.5" strokeWidth={3} />
                      </span>
                      <span className="font-medium leading-normal">
                        {formatPermissionLabel(perm)}
                      </span>
                    </div>
                    <span className="shrink-0 rounded-md bg-black/[0.04] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                      Allow
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        {/* Action Buttons: Allow Access & Deny */}
        <div className="flex items-center gap-3 pt-2">
          <form action={consentAction} className="flex-1">
            <input type="hidden" name="redirect_uri" value={redirectUri} />
            <Button
              type="submit"
              variant="brand"
              className="h-11 w-full text-sm font-semibold shadow-sm transition-all hover:-translate-y-px hover:shadow-md active:translate-y-0"
            >
              {hasCustomPermissions ? "Allow access" : "Continue"}
            </Button>
          </form>

          <form action={denyConsentAction} className="flex-1">
            <input type="hidden" name="redirect_uri" value={redirectUri} />
            <Button
              type="submit"
              variant="outline"
              className="h-11 w-full text-sm font-semibold transition-all hover:-translate-y-px hover:border-black/15 hover:shadow-sm active:translate-y-0"
            >
              Cancel
            </Button>
          </form>
        </div>
      </div>
    </AuthShell>
  );
}
