"use client";

import Link from "next/link";
import { AtSign, IdCard, RefreshCw, ShieldCheck, UserRound } from "lucide-react";
import { useFormStatus } from "react-dom";
import { denyConsentAction, consentAction } from "@/app/actions/auth";
import { AppRequestCard, type RequestingAppInfo } from "@/components/app-request-card";
import { AuthShell } from "@/components/auth-shell";
import { ProfileAvatar } from "@/components/ui/profile-avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { IdentityLabel } from "@/components/ui/identity-label";
import { AccountAvatar } from "@/components/account-avatar";
import { PermissionIcon } from "@/components/permission-icon";
import { parsePermissionScope } from "@/lib/oauth/scopes";
import { eyebrow, roundedRect } from "@/lib/design";
import { cn } from "@/lib/utils";
import type { AccountItemInfo } from "@/lib/user-profile";
import type { PermissionContext } from "@/lib/permission-types";

export type ConsentApplicationUserInfo = RequestingAppInfo;

export type ConsentPermission = {
  key: string;
  label: string;
  description: string;
  contextLabel: string;
  contextAuid?: string | null;
  icon?: string | null;
  app?: PermissionContext | null;
};

type ConsentFormProps = {
  applicationUser: ConsentApplicationUserInfo | null;
  redirectHost?: string | null;
  /** Standard OIDC scopes requested (openid, profile, email, offline_access). */
  oidcScopes?: string[];
  /** Custom AXUS permissions requested. */
  permissions: ConsentPermission[];
  redirectUri: string;
  accounts?: AccountItemInfo[];
  currentAuid?: string;
};

const sharedDataByScope: Record<string, { label: string; Icon: typeof UserRound }> = {
  openid: { label: "Your AXUS ID identifier", Icon: IdCard },
  profile: { label: "Your name and username", Icon: UserRound },
  email: { label: "Your AXUS email address", Icon: AtSign },
  offline_access: { label: "Stay signed in when you’re not using the app", Icon: RefreshCw },
};

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

function SubmitButton({
  children,
  pendingLabel,
  variant,
}: {
  children: React.ReactNode;
  pendingLabel: string;
  variant: "primary" | "secondary";
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} className="w-full" loading={pending}>
      {pending ? pendingLabel : children}
    </Button>
  );
}

export function ConsentForm({
  applicationUser,
  redirectHost,
  oidcScopes = [],
  permissions,
  redirectUri,
  accounts = [],
  currentAuid = "",
}: ConsentFormProps) {
  const activeAccount =
    accounts.find((a) => a.auid === currentAuid) ||
    accounts.find((a) => a.isActive) ||
    accounts[0];

  const appName = applicationUser?.displayName || "This application";
  const hasCustomPermissions = permissions.length > 0;
  const changeAccountHref = buildChangeAccountHref(redirectUri);

  const sharedData = (oidcScopes.length > 0 ? oidcScopes : ["openid", "profile"])
    .map((scope) => sharedDataByScope[scope])
    .filter(Boolean);

  return (
    <AuthShell
      step={{ current: 2, total: 2 }}
      title={hasCustomPermissions ? `${appName} wants access to your account` : `Sign in to ${appName}`}
      description="Review what will be shared. You can disconnect this app at any time."
      context={<AppRequestCard app={applicationUser} appName={appName} />}
    >
      <div className="space-y-6">
        <section aria-labelledby="consent-account">
          <p id="consent-account" className={cn(eyebrow, "mb-2")}>
            Signing in as
          </p>
          {activeAccount ? (
            <div
              className={cn(
                "flex items-center gap-3 border border-black/[0.06] bg-neutral-50 py-2.5 pl-3 pr-2",
                roundedRect,
              )}
            >
              <ProfileAvatar
                imageUrl={activeAccount.avatarUrl}
                alt={activeAccount.displayName || activeAccount.username || "Account photo"}
                firstName={activeAccount.firstName}
                lastName={activeAccount.lastName}
                displayName={activeAccount.displayName}
                username={activeAccount.username}
                seed={activeAccount.auid}
              />
              <IdentityLabel
                className="flex-1"
                displayName={activeAccount.displayName}
                username={activeAccount.username}
                firstName={activeAccount.firstName}
                lastName={activeAccount.lastName}
              />
              <Link href={changeAccountHref} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                Switch
              </Link>
            </div>
          ) : null}
        </section>

        <section aria-labelledby="consent-shared">
          <p id="consent-shared" className={cn(eyebrow, "mb-2")}>
            {hasCustomPermissions ? `${appName} will have access to` : `${appName} will be able to see`}
          </p>
          <ul className={cn("divide-y divide-black/[0.05] border border-black/[0.07] bg-white", roundedRect)}>
            {sharedData.map(({ label, Icon }) => (
              <li key={label} className="flex items-center gap-3 px-3.5 py-3 text-sm text-neutral-800">
                <Icon aria-hidden className="h-4 w-4 shrink-0 text-neutral-400" />
                <span>{label}</span>
              </li>
            ))}
            {permissions.map((permission) => {
              const parsed = parsePermissionScope(permission.key);
              const fallbackKey = parsed.key;
              const hasTitle = Boolean(
                permission.label &&
                permission.label !== permission.key &&
                permission.label !== fallbackKey,
              );
              const title =
                parsed.key === "*" &&
                (!hasTitle || permission.label.startsWith("All permissions you hold in"))
                  ? "All permissions you hold"
                  : hasTitle
                    ? permission.label
                    : fallbackKey;
              const hasDescription = Boolean(permission.description);
              const appContext =
                permission.app ??
                (permission.contextAuid
                  ? {
                      id: permission.contextAuid,
                      label: permission.contextLabel || `App ${permission.contextAuid}`,
                      username: null,
                      avatarUrl: null,
                    }
                  : null);

              return (
                <li
                  key={permission.key}
                  className={cn(
                    "flex gap-3 px-3.5 py-3 text-sm text-neutral-800",
                    hasDescription ? "items-start" : "items-center",
                  )}
                >
                  <PermissionIcon
                    name={permission.icon}
                    className={cn(
                      "h-4 w-4 shrink-0 text-neutral-400",
                      hasDescription && "mt-0.5",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-normal text-neutral-800">{title}</span>
                      {appContext ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-neutral-500">
                          <span className="text-neutral-300">·</span>
                          <AccountAvatar
                            account={appContext}
                            size="xs"
                            className="h-4 w-4 shrink-0 text-[9px]"
                            shape="rounded"
                          />
                          <span className="font-medium text-neutral-600">{appContext.label}</span>
                        </span>
                      ) : null}
                    </div>
                    {hasDescription ? (
                      <p className="mt-0.5 text-xs text-neutral-500">{permission.description}</p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <div className="flex flex-col-reverse gap-2.5 min-[420px]:flex-row">
          <form action={denyConsentAction} className="flex-1">
            <input type="hidden" name="redirect_uri" value={redirectUri} />
            <SubmitButton variant="secondary" pendingLabel="Cancelling…">
              Cancel
            </SubmitButton>
          </form>
          <form action={consentAction} className="flex-1">
            <input type="hidden" name="redirect_uri" value={redirectUri} />
            <SubmitButton variant="primary" pendingLabel="Continuing…">
              {hasCustomPermissions ? "Allow" : "Continue"}
            </SubmitButton>
          </form>
        </div>

        <p className="flex items-start gap-2 text-xs leading-relaxed text-neutral-500">
          <ShieldCheck aria-hidden className="mt-px h-3.5 w-3.5 shrink-0 text-neutral-400" />
          <span>
            Only continue if you trust {appName}
            {redirectHost ? (
              <>
                {" "}— you’ll be sent to <span className="font-medium text-neutral-700">{redirectHost}</span>
              </>
            ) : null}
            . AXUS ID never shares your password.
          </span>
        </p>
      </div>
    </AuthShell>
  );
}
