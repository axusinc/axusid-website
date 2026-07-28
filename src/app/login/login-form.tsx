"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/app/account/dashboard-ui";
import { loginAction, switchAccountAction, type AuthActionState } from "@/app/actions/auth";
import { roundedRect } from "@/lib/design";
import { cn } from "@/lib/utils";
import type { AccountItemInfo } from "@/lib/user-profile";

type LoginFormProps = {
  isOAuthFlow?: boolean;
  registeredUsername?: string;
  redirectUri?: string;
  next?: string;
  existingAccounts?: AccountItemInfo[];
  isAddAccount?: boolean;
};

const initialState: AuthActionState = {};

export function LoginForm({
  isOAuthFlow,
  registeredUsername,
  redirectUri,
  next,
  existingAccounts = [],
  isAddAccount: initialIsAddAccount = false,
}: LoginFormProps) {
  const [state, formAction, pending] = useActionState(loginAction, initialState);
  const [showCredentialsForm, setShowCredentialsForm] = useState(
    initialIsAddAccount || existingAccounts.length === 0,
  );
  const [selectedAuid, setSelectedAuid] = useState(
    existingAccounts.find((a) => a.isActive)?.auid || existingAccounts[0]?.auid || "",
  );
  const [, startTransition] = useTransition();

  const handleSelectAccount = (auid: string, formData: FormData) => {
    setSelectedAuid(auid);
    startTransition(async () => {
      await switchAccountAction(formData);
    });
  };

  const hasExistingAccounts = existingAccounts.length > 0;

  // Step 1: Account Picker View ("Choose an account")
  if (!showCredentialsForm && hasExistingAccounts) {
    return (
      <AuthShell
        title="Choose an account"
        description={
          isOAuthFlow
            ? "to continue authorizing the application"
            : "to continue to AXUS ID"
        }
        footer={
          <>
            New to AXUS ID?{" "}
            <Link
              href={redirectUri ? `/register?redirect_uri=${encodeURIComponent(redirectUri)}` : "/register"}
              className="font-medium text-black underline-offset-4 hover:underline"
            >
              Create an account
            </Link>
          </>
        }
      >
        <div className="space-y-3">
          {/* Vertical Account List */}
          <div className="space-y-2">
            {existingAccounts.map((account) => {
              const isActive = account.auid === selectedAuid;
              const usernameDisplay = account.username ? `@${account.username}` : null;

              return (
                <form
                  key={account.auid}
                  action={(formData) => handleSelectAccount(account.auid, formData)}
                >
                  <input type="hidden" name="auid" value={account.auid} />
                  {redirectUri ? <input type="hidden" name="redirect_uri" value={redirectUri} /> : null}
                  {next ? <input type="hidden" name="next" value={next} /> : null}
                  <button
                    type="submit"
                    className={cn(
                      "group flex w-full items-center justify-between p-3 border text-left transition-all focus:outline-none focus:ring-2 focus:ring-black/10 cursor-pointer",
                      roundedRect,
                      isActive
                        ? "border-black/15 bg-neutral-100/90 text-black font-medium shadow-2xs"
                        : "border-black/5 bg-white/70 text-neutral-800 hover:bg-white hover:border-black/10 hover:shadow-xs",
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar
                        firstName={account.firstName}
                        lastName={account.lastName}
                        username={account.username}
                        size="sm"
                        className="h-8 w-8 text-xs font-bold ring-0"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-black truncate">
                          {account.displayName}
                        </p>
                        {usernameDisplay && (
                          <p className="text-[11px] text-neutral-500 truncate">
                            {usernameDisplay}
                          </p>
                        )}
                      </div>
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

          {/* Use Another Account Action Button */}
          <button
            type="button"
            onClick={() => setShowCredentialsForm(true)}
            className={cn(
              "flex w-full items-center gap-3 p-3 border border-dashed border-black/15 bg-neutral-50/50 hover:bg-neutral-100/80 text-neutral-700 hover:text-black text-xs font-medium transition-all cursor-pointer",
              roundedRect,
            )}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black/5 text-neutral-700">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <span>Use another account</span>
          </button>
        </div>
      </AuthShell>
    );
  }

  // Step 2: Credentials View ("Sign in" / "Add an account")
  return (
    <AuthShell
      title={hasExistingAccounts ? "Add an account" : "Sign in"}
      description={
        hasExistingAccounts
          ? "Sign in with credentials to add another account to your session."
          : isOAuthFlow
            ? "Sign in to continue authorizing the application."
            : "Sign in with your username and password."
      }
      footer={
        hasExistingAccounts ? (
          <button
            type="button"
            onClick={() => setShowCredentialsForm(false)}
            className="font-medium text-black underline-offset-4 hover:underline"
          >
            Or choose a signed-in account
          </button>
        ) : (
          <>
            New to AXUS ID?{" "}
            <Link
              href={redirectUri ? `/register?redirect_uri=${encodeURIComponent(redirectUri)}` : "/register"}
              className="font-medium text-black underline-offset-4 hover:underline"
            >
              Create an account
            </Link>
          </>
        )
      }
    >
      {registeredUsername ? (
        <div
          className={cn(
            "mb-6 border border-black/5 bg-neutral-50/80 px-4 py-3 text-sm text-neutral-600 backdrop-blur-sm",
            roundedRect,
          )}
        >
          Account created. Sign in with username{" "}
          <span className="font-medium text-black">{registeredUsername}</span>.
        </div>
      ) : null}

      {/* Back to Account List link if accounts exist */}
      {hasExistingAccounts && (
        <button
          type="button"
          onClick={() => setShowCredentialsForm(false)}
          className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-black transition-colors"
        >
          &larr; Back to account list
        </button>
      )}

      <form action={formAction} className="space-y-4">
        {redirectUri ? <input type="hidden" name="redirect_uri" value={redirectUri} /> : null}
        {next ? <input type="hidden" name="next" value={next} /> : null}
        <Input
          name="username"
          label="Username"
          placeholder="Your username"
          autoComplete="username"
          defaultValue={registeredUsername}
          required
        />
        <Input
          name="password"
          label="Password"
          type="password"
          placeholder="Enter your password"
          autoComplete="current-password"
          required
        />

        {state.error ? <FormError>{state.error}</FormError> : null}

        <Button
          type="submit"
          variant="brand"
          className="w-full h-11 transition-transform active:scale-[0.99]"
          disabled={pending}
        >
          {pending ? "Signing in..." : hasExistingAccounts ? "Add account" : "Continue"}
        </Button>
      </form>
    </AuthShell>
  );
}
