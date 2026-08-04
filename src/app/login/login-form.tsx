"use client";

import Image from "next/image";
import Link from "next/link";
import { Fingerprint } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import { Avatar } from "@/app/account/dashboard-ui";
import {
  checkUsernameAction,
  loginAction,
  switchAccountAction,
  type AuthActionState,
} from "@/app/actions/auth";
import { loginWithPasskeyAction, startPasskeyLoginAction } from "@/app/actions/passkey";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { roundedRect } from "@/lib/design";
import { cn, isRedirectError } from "@/lib/utils";
import { getPasskeyCredential } from "@/lib/webauthn";
import type { AccountItemInfo } from "@/lib/user-profile";

type LoginFormProps = {
  isOAuthFlow?: boolean;
  registeredUsername?: string;
  redirectUri?: string;
  next?: string;
  existingAccounts?: AccountItemInfo[];
  isAddAccount?: boolean;
  authError?: string;
};

const initialState: AuthActionState = {};

export function LoginForm({
  isOAuthFlow,
  registeredUsername,
  redirectUri,
  next,
  existingAccounts = [],
  isAddAccount: initialIsAddAccount = false,
  authError,
}: LoginFormProps) {
  const [state, formAction, pending] = useActionState(loginAction, initialState);
  const [showCredentialsForm, setShowCredentialsForm] = useState(
    initialIsAddAccount || existingAccounts.length === 0,
  );
  const [credentialStep, setCredentialStep] = useState<"identifier" | "password">(
    registeredUsername ? "password" : "identifier",
  );
  const [username, setUsername] = useState(registeredUsername ?? "");
  const [showPassword, setShowPassword] = useState(false);
  const [selectedAuid, setSelectedAuid] = useState(
    existingAccounts.find((account) => account.isActive)?.auid ||
      existingAccounts[0]?.auid ||
      "",
  );
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [passkeyError, setPasskeyError] = useState<string | null>(null);
  const [isUsernamePending, startUsernameTransition] = useTransition();
  const [isPasskeyPending, startPasskeyTransition] = useTransition();
  const [isSwitchPending, startSwitchTransition] = useTransition();

  const hasExistingAccounts = existingAccounts.length > 0;
  const createAccountParams = new URLSearchParams();
  if (redirectUri) createAccountParams.set("redirect_uri", redirectUri);
  if (next) createAccountParams.set("next", next);
  if (hasExistingAccounts) createAccountParams.set("add_account", "true");
  const createAccountQuery = createAccountParams.toString();
  const createAccountHref = createAccountQuery
    ? `/register?${createAccountQuery}`
    : "/register";
  const googleParams = new URLSearchParams();
  if (redirectUri) googleParams.set("redirect_uri", redirectUri);
  if (next) googleParams.set("next", next);
  const googleQuery = googleParams.toString();
  const googleSignInHref = googleQuery ? `/auth/google?${googleQuery}` : "/auth/google";

  const handlePasskeySignIn = () => {
    setPasskeyError(null);
    const normalizedUsername = username.trim().replace(/^@/, "");

    setUsernameError(null);

    startPasskeyTransition(async () => {
      try {
        const init = await startPasskeyLoginAction(
          normalizedUsername || undefined,
          redirectUri,
        );
        if (init.error || !init.loginResponse) {
          setPasskeyError(init.error || "Unable to start passkey sign in.");
          return;
        }

        const credential = await getPasskeyCredential(init.loginResponse.optionsJson);
        const result = await loginWithPasskeyAction({
          username: normalizedUsername || undefined,
          challengeId: init.loginResponse.challengeId,
          credentialResponse: JSON.stringify(credential),
          redirectUri,
          next,
        });

        if (result?.error) {
          setPasskeyError(result.error);
        }
      } catch (error) {
        if (isRedirectError(error)) {
          throw error;
        }
        if (error instanceof Error && error.name === "NotAllowedError") {
          return;
        }
        setPasskeyError(
          error instanceof Error ? error.message : "Passkey sign in failed.",
        );
      }
    });
  };

  const handleSelectAccount = (auid: string, formData: FormData) => {
    setSelectedAuid(auid);
    startSwitchTransition(async () => {
      await switchAccountAction(formData);
    });
  };

  const handleUsernameSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedUsername = username.trim().replace(/^@/, "");
    if (!normalizedUsername) {
      setUsernameError("Enter your username.");
      return;
    }

    setUsername(normalizedUsername);
    setUsernameError(null);
    setPasskeyError(null);

    startUsernameTransition(async () => {
      try {
        const result = await checkUsernameAction(normalizedUsername);
        if (!result.exists) {
          setUsernameError(
            result.error || "We couldn’t find an AXUS ID with that username.",
          );
          return;
        }

        setCredentialStep("password");
      } catch {
        setUsernameError("We couldn’t check that username. Try again.");
      }
    });
  };

  if (!showCredentialsForm && hasExistingAccounts) {
    return (
      <AuthShell
        variant="sign-in"
        maxWidthClass="max-w-[920px]"
        title="Choose an account"
        description={
          isOAuthFlow
            ? "Select a signed-in identity to continue securely with this application."
            : "Pick an identity to continue to your AXUS account."
        }
      >
        <div className="mb-6">
          <h2 className="text-xl font-semibold tracking-tight text-black">Your accounts</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-neutral-500">
            Continue with an account that is already signed in on this device.
          </p>
        </div>

        <div className="space-y-2">
          {existingAccounts.map((account) => {
            const isActive = account.auid === selectedAuid;
            const usernameDisplay = account.username ? `@${account.username}` : account.auid;

            return (
              <form
                key={account.auid}
                action={(formData) => handleSelectAccount(account.auid, formData)}
              >
                <input type="hidden" name="auid" value={account.auid} />
                {redirectUri ? (
                  <input type="hidden" name="redirect_uri" value={redirectUri} />
                ) : null}
                <input type="hidden" name="next" value={next || "/account"} />
                <button
                  type="submit"
                  disabled={isSwitchPending}
                  className={cn(
                    "group flex w-full cursor-pointer items-center gap-3 border px-4 py-3 text-left transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black/5 disabled:cursor-wait disabled:opacity-60",
                    roundedRect,
                    isActive
                      ? "border-black/10 bg-neutral-100/90 shadow-xs"
                      : "border-black/[0.06] bg-white/70 hover:border-black/10 hover:bg-white hover:shadow-sm",
                  )}
                >
                  <Avatar
                    firstName={account.firstName}
                    lastName={account.lastName}
                    username={account.username}
                    size="md"
                    className="ring-2 ring-black/[0.04]"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-black">
                      {account.displayName}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-neutral-500">
                      {usernameDisplay}
                    </span>
                  </span>
                  {isActive ? (
                    <span className="rounded-full bg-black/[0.06] px-2.5 py-1 text-[11px] font-medium text-neutral-600">
                      Current
                    </span>
                  ) : (
                    <span className="text-lg text-neutral-300 transition-transform group-hover:translate-x-0.5 group-hover:text-neutral-500">
                      →
                    </span>
                  )}
                </button>
              </form>
            );
          })}

          <button
            type="button"
            onClick={() => {
              setShowCredentialsForm(true);
              setCredentialStep("identifier");
            }}
            className={cn(
              "flex w-full cursor-pointer items-center gap-3 border border-dashed border-black/10 bg-neutral-50/60 px-4 py-3 text-left text-sm font-medium text-neutral-600 transition-all hover:border-black/15 hover:bg-neutral-100 hover:text-black focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black/5",
              roundedRect,
            )}
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/[0.05] text-xl font-light">
              +
            </span>
            Use another account
          </button>
        </div>

        <p className="mt-7 text-center text-sm text-neutral-500">
          Need a new identity?{" "}
          <Link
            href={createAccountHref}
            className="font-semibold text-black underline-offset-4 hover:underline"
          >
            Create an AXUS ID
          </Link>
        </p>
      </AuthShell>
    );
  }

  if (credentialStep === "identifier") {
    return (
      <AuthShell
        variant="sign-in"
        signInStep={1}
        maxWidthClass="max-w-[920px]"
        title={hasExistingAccounts ? "Add another account" : "Welcome back"}
        description={
          isOAuthFlow
            ? "Sign in with AXUS ID to continue securely with this application."
            : "Enter your username first. We’ll ask for your password on the next step."
        }
      >
        <div className="mb-7">
          <h2 className="text-xl font-semibold tracking-tight text-black">Enter your username</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-neutral-500">
            Use the username connected to your AXUS ID.
          </p>
        </div>

        <div className="space-y-5">
          <form
            className="space-y-5"
            onSubmit={handleUsernameSubmit}
            aria-busy={isUsernamePending}
          >
            <Input
              id="login-username"
              name="username"
              label="Username"
              value={username}
              onChange={(event) => {
                setUsername(event.target.value);
                setUsernameError(null);
              }}
              error={usernameError || undefined}
              placeholder="Enter your username"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              autoFocus
              required
              className="h-12 bg-white"
            />

            <Button
              type="submit"
              variant="brand"
              className="h-11 w-full font-semibold shadow-sm transition-all hover:-translate-y-px hover:shadow-md active:translate-y-0"
              disabled={isUsernamePending || isPasskeyPending}
            >
              {isUsernamePending ? "Checking username…" : "Continue"}
            </Button>
          </form>

          {passkeyError ? <FormError>{passkeyError}</FormError> : null}
          {authError ? <FormError>{authError}</FormError> : null}

          <div className="relative py-1">
            <div className="absolute inset-0 flex items-center" aria-hidden>
              <span className="w-full border-t border-black/[0.07]" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-400">
                Or
              </span>
            </div>
          </div>

          <a
            href={googleSignInHref}
            className={cn(
              "inline-flex h-11 w-full items-center justify-center gap-3 border border-black/10 bg-white/70 px-4 text-sm font-semibold text-black transition-all hover:-translate-y-px hover:border-black/15 hover:bg-white hover:shadow-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black/10 active:translate-y-0",
              roundedRect,
            )}
          >
            <Image
              src="/google-g.svg"
              width={18}
              height={18}
              alt=""
              aria-hidden
              className="h-[18px] w-[18px]"
            />
            Continue with Google
          </a>

          <Button
            type="button"
            variant="outline"
            className="h-11 w-full gap-3 bg-white/70 font-semibold transition-all hover:-translate-y-px hover:border-black/15 hover:shadow-sm active:translate-y-0"
            disabled={isUsernamePending || isPasskeyPending}
            onClick={handlePasskeySignIn}
          >
            <Fingerprint className="h-5 w-5" aria-hidden />
            {isPasskeyPending ? "Checking passkey…" : "Continue with a passkey"}
          </Button>
        </div>

        <div className="mt-7 space-y-3 text-center text-sm text-neutral-500">
          <p>
            New to AXUS ID?{" "}
            <Link
              href={createAccountHref}
              className="font-semibold text-black underline-offset-4 hover:underline"
            >
              Create an account
            </Link>
          </p>
          {hasExistingAccounts ? (
            <button
              type="button"
              onClick={() => setShowCredentialsForm(false)}
              className="font-medium text-neutral-500 underline-offset-4 transition-colors hover:text-black hover:underline"
            >
              Back to signed-in accounts
            </button>
          ) : null}
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      variant="sign-in"
      signInStep={2}
      maxWidthClass="max-w-[920px]"
      title="Confirm it’s you"
      description="Enter your password to finish signing in to your AXUS ID."
    >
      <div className="mb-7">
        <h2 className="text-xl font-semibold tracking-tight text-black">Enter your password</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-neutral-500">
          Signing in as the account below.
        </p>
      </div>

      <button
        type="button"
        onClick={() => {
          setPasskeyError(null);
          setCredentialStep("identifier");
        }}
        className={cn(
          "group mb-6 flex w-full items-center gap-3 border border-black/[0.06] bg-neutral-50/80 px-4 py-3 text-left transition-all hover:border-black/10 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black/5",
          roundedRect,
        )}
        aria-label={`Change account from ${username}`}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black text-sm font-semibold uppercase text-white shadow-sm">
          {username.charAt(0) || "A"}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-medium text-neutral-500">AXUS ID</span>
          <span className="block truncate text-sm font-semibold text-black">
            @{username.replace(/^@/, "")}
          </span>
        </span>
        <span className="text-xs font-semibold text-neutral-400 transition-colors group-hover:text-black">
          Change
        </span>
      </button>

      {registeredUsername ? (
        <p className="mb-5 rounded-[12px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Your account is ready. Use the password you just created to sign in.
        </p>
      ) : null}

      <form action={formAction} className="space-y-5">
        <input type="hidden" name="username" value={username} />
        {redirectUri ? <input type="hidden" name="redirect_uri" value={redirectUri} /> : null}
        {next ? <input type="hidden" name="next" value={next} /> : null}

        <div className="relative">
          <Input
            id="login-password"
            name="password"
            label="Password"
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            autoComplete="current-password"
            autoFocus
            required
            className="h-12 bg-white pr-16"
          />
          <button
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            className="absolute right-3 top-[36px] rounded-md px-2 py-1 text-xs font-semibold text-neutral-500 transition-colors hover:bg-black/[0.04] hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>

        {state.error ? <FormError>{state.error}</FormError> : null}
        {passkeyError ? <FormError>{passkeyError}</FormError> : null}

        <Button
          type="submit"
          variant="brand"
          className="h-11 w-full font-semibold shadow-sm transition-all hover:-translate-y-px hover:shadow-md active:translate-y-0"
          disabled={pending || isPasskeyPending}
        >
          {pending ? "Signing in…" : "Sign in"}
        </Button>

        <Button
          type="button"
          variant="outline"
          className="h-11 w-full gap-3 bg-white/70 font-semibold transition-all hover:-translate-y-px hover:border-black/15 hover:shadow-sm active:translate-y-0"
          disabled={pending || isPasskeyPending}
          onClick={handlePasskeySignIn}
        >
          <Fingerprint className="h-5 w-5" aria-hidden />
          {isPasskeyPending ? "Checking passkey…" : "Use a passkey instead"}
        </Button>
      </form>

      <button
        type="button"
        onClick={() => setCredentialStep("identifier")}
        className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-neutral-500 transition-colors hover:text-black"
      >
        <span aria-hidden>←</span>
        Back to username
      </button>
    </AuthShell>
  );
}
