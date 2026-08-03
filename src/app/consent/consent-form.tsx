"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { denyConsentAction, consentAction, switchAccountAction } from "@/app/actions/auth";
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
  redirectHost: string | null;
  permissions: string[];
  redirectUri: string;
  accounts?: AccountItemInfo[];
  currentAuid?: string;
};

export function ConsentForm({
  applicationUser,
  redirectHost,
  permissions,
  redirectUri,
  accounts = [],
  currentAuid = "",
}: ConsentFormProps) {
  const [selectedAuid, setSelectedAuid] = useState(currentAuid || accounts[0]?.auid || "");
  const [, startTransition] = useTransition();

  const hasPermissions = permissions.length > 0;
  const fullName = applicationUser?.displayName.trim() ?? "";
  const hasDistinctName = Boolean(
    applicationUser &&
      fullName &&
      fullName !== applicationUser.username,
  );

  const handleSelectAccount = (auid: string, formData: FormData) => {
    setSelectedAuid(auid);
    startTransition(async () => {
      await switchAccountAction(formData);
    });
  };

  return (
    <AuthShell
      title="Authorize access"
      description="Review the application details and choose an account to log in."
      maxWidthClass="max-w-3xl"
    >
      <div className="grid gap-6 md:grid-cols-2 md:items-stretch">
        {/* Left Side: Application Info & Permissions */}
        <div className={cn("flex flex-col justify-between space-y-4 border border-black/5 bg-white/60 p-5 backdrop-blur-sm", roundedRect)}>
          <div className="space-y-4">
            {applicationUser ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                  Application
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <Avatar
                    size="md"
                    firstName={applicationUser.firstName}
                    lastName={applicationUser.lastName}
                    username={applicationUser.username}
                    className="h-10 w-10 text-xs font-bold"
                  />
                  <div className="min-w-0">
                    {hasDistinctName ? (
                      <p className="truncate text-sm font-semibold text-neutral-900">
                        {fullName}
                      </p>
                    ) : null}
                    {applicationUser.username ? (
                      <p
                        className={cn(
                          "truncate text-xs text-neutral-700",
                          hasDistinctName
                            ? "text-neutral-500"
                            : "font-semibold text-neutral-900",
                        )}
                      >
                        @{applicationUser.username}
                      </p>
                    ) : (
                      <p className="truncate text-sm font-semibold text-neutral-900">
                        {applicationUser.displayName}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            {redirectHost ? (
              <div className={cn(applicationUser ? "border-t border-black/5 pt-3" : undefined)}>
                <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                  Redirecting to
                </p>
                <p className="mt-1.5 truncate text-xs font-medium text-neutral-700">
                  {redirectHost}
                </p>
              </div>
            ) : null}

            {hasPermissions ? (
              <div className="border-t border-black/5 pt-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                  Requested permissions
                </p>
                <ul className="mt-2 space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {permissions.map((permission) => (
                    <li
                      key={permission}
                      className={cn(
                        "flex items-center justify-between bg-neutral-50/80 px-2.5 py-1.5 text-xs text-neutral-700 border border-black/5",
                        roundedRect,
                      )}
                    >
                      <span>{formatPermissionLabel(permission)}</span>
                      <span className="text-[10px] uppercase tracking-wide font-medium text-neutral-400">
                        allow
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>

        {/* Right Side: Account Selection ("Log in as") & Action Buttons */}
        <div className="flex flex-col justify-between space-y-4">
          <div className={cn("space-y-3 border border-black/5 bg-white/60 p-5 backdrop-blur-sm flex-1", roundedRect)}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Log in as
              </p>
              <Link
                href={`/login?add_account=true&redirect_uri=${encodeURIComponent(redirectUri)}`}
                className="text-xs font-medium text-black hover:underline"
              >
                + Add account
              </Link>
            </div>

            {/* Accounts Selector List */}
            {accounts.length > 0 ? (
              <div className="space-y-1.5">
                {accounts.map((account) => {
                  const isActive = account.auid === selectedAuid;
                  const usernameDisplay = account.username
                    ? `@${account.username}`
                    : account.displayName;

                  return (
                    <form
                      key={account.auid}
                      action={(formData) => handleSelectAccount(account.auid, formData)}
                    >
                      <input type="hidden" name="auid" value={account.auid} />
                      <input type="hidden" name="redirect_uri" value={redirectUri} />
                      <button
                        type="submit"
                        className={cn(
                          "group flex w-full items-center justify-between px-3 py-2 border text-left transition-all focus:outline-none focus:ring-2 focus:ring-black/10 cursor-pointer",
                          roundedRect,
                          isActive
                            ? "border-black/15 bg-neutral-100/90 text-black font-medium"
                            : "border-black/5 bg-white/60 text-neutral-600 hover:bg-white hover:text-black hover:border-black/10",
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar
                            firstName={account.firstName}
                            lastName={account.lastName}
                            username={account.username}
                            size="sm"
                            className="h-5 w-5 text-[10px] font-bold ring-0"
                          />
                          <p className="text-xs font-medium text-black truncate">
                            {usernameDisplay}
                          </p>
                        </div>
                        {isActive ? (
                          <span className="text-[10px] font-semibold text-neutral-600 bg-black/[0.06] px-2 py-0.5 rounded-md">
                            Active
                          </span>
                        ) : null}
                      </button>
                    </form>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-neutral-500">No active accounts.</p>
            )}
          </div>

          {/* Action Buttons: Allow Access & Deny Horizontally */}
          <div className="flex items-center gap-3 pt-1">
            <form action={consentAction} className="flex-1">
              <input type="hidden" name="redirect_uri" value={redirectUri} />
              <Button
                type="submit"
                variant="brand"
                className="w-full transition-transform active:scale-[0.99]"
              >
                Allow access
              </Button>
            </form>

            <form action={denyConsentAction} className="flex-1">
              <input type="hidden" name="redirect_uri" value={redirectUri} />
              <Button type="submit" variant="outline" className="w-full">
                Deny
              </Button>
            </form>
          </div>
        </div>
      </div>
    </AuthShell>
  );
}
