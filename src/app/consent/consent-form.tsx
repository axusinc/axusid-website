"use client";

import Link from "next/link";
import { AtSign, IdCard, KeyRound, RefreshCw, ShieldCheck, UserRound } from "lucide-react";
import { useFormStatus } from "react-dom";
import { denyConsentAction, consentAction } from "@/app/actions/auth";
import { AppRequestCard, type RequestingAppInfo } from "@/components/app-request-card";
import { AuthShell } from "@/components/auth-shell";
import { ProfileAvatar } from "@/components/ui/profile-avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { IdentityLabel } from "@/components/ui/identity-label";
import { formatPermissionLabel } from "@/lib/oauth/scopes";
import { eyebrow, roundedRect } from "@/lib/design";
import { cn } from "@/lib/utils";
import type { AccountItemInfo } from "@/lib/user-profile";

export type ConsentApplicationUserInfo = RequestingAppInfo;

type ConsentFormProps = {
  applicationUser: ConsentApplicationUserInfo | null;
  redirectHost?: string | null;
  /** Standard OIDC scopes requested (openid, profile, email, offline_access). */
  oidcScopes?: string[];
  /** Custom AXUS permissions requested. */
  permissions: string[];
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
            {appName} will be able to see
          </p>
          <ul className={cn("divide-y divide-black/[0.05] border border-black/[0.07] bg-white", roundedRect)}>
            {sharedData.map(({ label, Icon }) => (
              <li key={label} className="flex items-center gap-3 px-3.5 py-3 text-sm text-neutral-800">
                <Icon aria-hidden className="h-4 w-4 shrink-0 text-neutral-400" />
                {label}
              </li>
            ))}
            {permissions.map((permission) => (
              <li key={permission} className="flex items-center gap-3 px-3.5 py-3 text-sm text-neutral-800">
                <KeyRound aria-hidden className="h-4 w-4 shrink-0 text-brand" />
                <span className="min-w-0 flex-1">{formatPermissionLabel(permission)}</span>
                <code className="hidden shrink-0 rounded-md bg-neutral-100 px-1.5 py-0.5 font-mono text-[11px] text-neutral-500 sm:inline">
                  {permission}
                </code>
              </li>
            ))}
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
