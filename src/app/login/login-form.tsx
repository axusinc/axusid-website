"use client";

import Link from "next/link";
import { GitHubIcon } from "@/components/ui/github-icon";
import { ArrowLeft, ChevronRight, Fingerprint, Plus } from "lucide-react";
import { useActionState, useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import {
  checkUsernameAction,
  loginAction,
  switchAccountAction,
  type AuthActionState,
} from "@/app/actions/auth";
import { loginWithPasskeyAction, startPasskeyLoginAction } from "@/app/actions/passkey";
import { AppRequestCard, type RequestingAppInfo } from "@/components/app-request-card";
import { AuthPanelHeading, AuthShell } from "@/components/auth-shell";
import { ProfileAvatar } from "@/components/ui/profile-avatar";
import { UsernameAvatar } from "@/components/username-avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { Divider } from "@/components/ui/divider";
import { Alert, FormError } from "@/components/ui/form-message";
import { GoogleButton } from "@/components/ui/google-button";
import { IdentityLabel } from "@/components/ui/identity-label";
import { Input } from "@/components/ui/input";
import { LastUsedBadge } from "@/components/ui/last-used-badge";
import { PasswordInput } from "@/components/ui/password-input";
import { Spinner } from "@/components/ui/spinner";
import { focusRing, roundedRect } from "@/lib/design";
import {
  getClientLastAuthMethod,
  setClientLastAuthMethod,
  subscribeLastAuthMethod,
  type LastAuthMethod,
} from "@/lib/last-auth-method";
import { cn, isRedirectError } from "@/lib/utils";
import { getPasskeyCredential, isConditionalMediationAvailable } from "@/lib/webauthn";
import type { AccountItemInfo } from "@/lib/user-profile";

export type TargetAppUserInfo = RequestingAppInfo;

type LoginFormProps = {
  isOAuthFlow?: boolean;
  targetAppName?: string | null;
  targetAppUser?: TargetAppUserInfo | null;
  registeredUsername?: string;
  redirectUri?: string;
  next?: string;
  existingAccounts?: AccountItemInfo[];
  isAddAccount?: boolean;
  authError?: string;
  lastUsedMethod?: LastAuthMethod | null;
};

const initialState: AuthActionState = {};

const linkClassName =
  "font-semibold text-neutral-950 underline-offset-4 hover:underline rounded-sm " + focusRing;

export function LoginForm({
  isOAuthFlow,
  targetAppName,
  targetAppUser,
  registeredUsername,
  redirectUri,
  next,
  existingAccounts = [],
  isAddAccount: initialIsAddAccount = false,
  authError,
  lastUsedMethod,
}: LoginFormProps) {
  const [state, formAction, pending] = useActionState(loginAction, initialState);
  const clientLastUsed = useSyncExternalStore(
    subscribeLastAuthMethod,
    getClientLastAuthMethod,
    () => null,
  );
  const [selectedMethod, setSelectedMethod] = useState<LastAuthMethod | null>(null);
  const lastUsed = selectedMethod ?? clientLastUsed ?? lastUsedMethod ?? null;
  const [showCredentialsForm, setShowCredentialsForm] = useState(
    initialIsAddAccount || existingAccounts.length === 0,
  );
  const [credentialStep, setCredentialStep] = useState<"identifier" | "password">(
    registeredUsername ? "password" : "identifier",
  );
  const [username, setUsername] = useState(registeredUsername ?? "");
  const [switchError, setSwitchError] = useState<string | null>(null);
  const [selectedAuid, setSelectedAuid] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [passkeyError, setPasskeyError] = useState<string | null>(null);
  const [isUsernamePending, startUsernameTransition] = useTransition();
  const [isPasskeyPending, startPasskeyTransition] = useTransition();
  const [isSwitchPending, startSwitchTransition] = useTransition();
  const conditionalAbortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!showCredentialsForm || credentialStep !== "identifier") {
      return;
    }

    let isMounted = true;
    const controller = new AbortController();
    conditionalAbortControllerRef.current = controller;

    async function initConditionalPasskey() {
      try {
        const available = await isConditionalMediationAvailable();
        if (!available || !isMounted || controller.signal.aborted) {
          return;
        }

        const rp = typeof window !== "undefined" ? window.location.hostname : undefined;
        const init = await startPasskeyLoginAction(undefined, redirectUri, rp);
        if (!init.loginResponse || !isMounted || controller.signal.aborted) {
          return;
        }

        const credential = await getPasskeyCredential(init.loginResponse.optionsJson, {
          mediation: "conditional",
          signal: controller.signal,
        });

        if (!isMounted || controller.signal.aborted) {
          return;
        }

        startPasskeyTransition(async () => {
          try {
            const result = await loginWithPasskeyAction({
              challengeId: init.loginResponse!.challengeId,
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
            if (
              error instanceof Error &&
              (error.name === "AbortError" || error.name === "NotAllowedError")
            ) {
              return;
            }
            setPasskeyError(
              error instanceof Error ? error.message : "Passkey sign-in failed. Try again.",
            );
          }
        });
      } catch (error) {
        if (isRedirectError(error)) {
          throw error;
        }
        if (
          error instanceof Error &&
          (error.name === "AbortError" || error.name === "NotAllowedError")
        ) {
          return;
        }
        console.debug("[Passkey Conditional UI]", error);
      }
    }

    initConditionalPasskey();

    return () => {
      isMounted = false;
      controller.abort();
      if (conditionalAbortControllerRef.current === controller) {
        conditionalAbortControllerRef.current = null;
      }
    };
  }, [showCredentialsForm, credentialStep, redirectUri, next]);

  const hasExistingAccounts = existingAccounts.length > 0;
  const appName = targetAppName || "the application";

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
    setClientLastAuthMethod("passkey");
    setSelectedMethod("passkey");

    if (conditionalAbortControllerRef.current) {
      conditionalAbortControllerRef.current.abort();
      conditionalAbortControllerRef.current = null;
    }

    startPasskeyTransition(async () => {
      try {
        const rp = typeof window !== "undefined" ? window.location.hostname : undefined;
        const init = await startPasskeyLoginAction(
          normalizedUsername || undefined,
          redirectUri,
          rp,
        );
        if (init.error || !init.loginResponse) {
          setPasskeyError(init.error || "We couldn’t start passkey sign-in. Try again.");
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
          error instanceof Error ? error.message : "Passkey sign-in failed. Try again.",
        );
      }
    });
  };

  const handleSelectAccount = (auid: string, formData: FormData) => {
    if (isSwitchPending) return;
    setSwitchError(null);
    setSelectedAuid(auid);
    startSwitchTransition(async () => {
      try {
        const result = await switchAccountAction(formData);
        if (result.error) setSwitchError(result.error);
      } catch (error) {
        if (isRedirectError(error)) throw error;
        setSwitchError("We couldn’t switch accounts. Try again.");
      }
    });
  };

  const handleUsernameSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (conditionalAbortControllerRef.current) {
      conditionalAbortControllerRef.current.abort();
      conditionalAbortControllerRef.current = null;
    }

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

  const oauthContext = isOAuthFlow ? (
    <AppRequestCard app={targetAppUser} appName={appName} />
  ) : null;
  const oauthStep = isOAuthFlow ? { current: 1, total: 2 } : undefined;

  const passkeyButton = (label: string, disabled: boolean, badge?: React.ReactNode) => (
    <Button
      type="button"
      variant="secondary"
      className="w-full gap-3"
      loading={isPasskeyPending}
      disabled={disabled}
      onClick={handlePasskeySignIn}
    >
      {isPasskeyPending ? null : <Fingerprint className="h-[18px] w-[18px]" aria-hidden />}
      <span>{isPasskeyPending ? "Waiting for passkey…" : label}</span>
      {badge}
    </Button>
  );

  if (!showCredentialsForm && hasExistingAccounts) {
    return (
      <AuthShell
        step={oauthStep}
        title={isOAuthFlow ? `Continue to ${appName}` : "Choose an account"}
        description={
          isOAuthFlow
            ? "Choose which AXUS ID to use. You can review what’s shared on the next step."
            : "Pick an account that’s already signed in on this device."
        }
        context={oauthContext}
      >
        <AuthPanelHeading
          title="Choose an account"
          description="Accounts signed in on this device."
        />

        {switchError ? <FormError>{switchError}</FormError> : null}

        <ul className="space-y-2" aria-busy={isSwitchPending}>
          {existingAccounts.map((account) => {
            const isSelected = account.auid === selectedAuid && isSwitchPending;

            return (
              <li key={account.auid}>
                <form action={(formData) => handleSelectAccount(account.auid, formData)}>
                  <input type="hidden" name="auid" value={account.auid} />
                  {redirectUri ? (
                    <input type="hidden" name="redirect_uri" value={redirectUri} />
                  ) : null}
                  <input type="hidden" name="next" value={next || "/account"} />
                  <button
                    type="submit"
                    disabled={isSwitchPending}
                    className={cn(
                      "group flex w-full cursor-pointer items-center gap-3 border border-black/[0.08] bg-white px-3.5 py-3 text-left shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-[border-color,background-color,box-shadow] hover:border-black/15 hover:bg-neutral-50 disabled:cursor-wait",
                      roundedRect,
                      focusRing,
                      isSwitchPending && !isSelected && "opacity-50",
                    )}
                  >
                    <ProfileAvatar
                      imageUrl={account.avatarUrl}
                      alt={account.displayName || account.username || "Account photo"}
                      firstName={account.firstName}
                      lastName={account.lastName}
                      displayName={account.displayName}
                      username={account.username}
                      seed={account.auid}
                    />
                    <IdentityLabel
                      className="flex-1"
                      displayName={account.displayName}
                      username={account.username}
                      firstName={account.firstName}
                      lastName={account.lastName}
                    />
                    {isSelected ? (
                      <Spinner className="text-neutral-400" />
                    ) : (
                      <ChevronRight
                        aria-hidden
                        className="h-4 w-4 shrink-0 text-neutral-300 transition-transform group-hover:translate-x-0.5 group-hover:text-neutral-500"
                      />
                    )}
                  </button>
                </form>
              </li>
            );
          })}

          <li>
            <button
              type="button"
              onClick={() => {
                setShowCredentialsForm(true);
                setCredentialStep("identifier");
              }}
              disabled={isSwitchPending}
              className={cn(
                "flex w-full cursor-pointer items-center gap-3 border border-dashed border-black/[0.12] px-3.5 py-3 text-left text-sm font-medium text-neutral-600 transition-colors hover:border-black/20 hover:bg-neutral-50 hover:text-neutral-950 disabled:opacity-50",
                roundedRect,
                focusRing,
              )}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 text-neutral-500">
                <Plus aria-hidden className="h-4 w-4" />
              </span>
              Use another account
            </button>
          </li>
        </ul>

        <p className="mt-8 text-center text-sm text-neutral-500">
          Need a new identity?{" "}
          <Link href={createAccountHref} className={linkClassName}>
            Create an AXUS ID
          </Link>
        </p>
      </AuthShell>
    );
  }

  if (credentialStep === "identifier") {
    return (
      <AuthShell
        step={oauthStep}
        title={
          isOAuthFlow
            ? `Sign in to continue to ${appName}`
            : hasExistingAccounts
              ? "Add another account"
              : "Welcome back"
        }
        description={
          isOAuthFlow
            ? "Use your AXUS ID. You’ll review what’s shared before anything leaves your account."
            : "Sign in to manage your profile, security and connected apps."
        }
        context={oauthContext}
      >
        <AuthPanelHeading title="Sign in" description="Enter the username of your AXUS ID." />

        <form className="space-y-4" onSubmit={handleUsernameSubmit} aria-busy={isUsernamePending} noValidate>
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
            placeholder="your-username"
            autoComplete="username webauthn"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoFocus
            required
          />

          <Button
            type="submit"
            className="w-full"
            loading={isUsernamePending}
            disabled={isPasskeyPending}
          >
            {isUsernamePending ? "Checking…" : "Continue"}
            {lastUsed === "password" ? <LastUsedBadge /> : null}
          </Button>
        </form>

        <div className="mt-4 space-y-4">
          {passkeyError ? <FormError>{passkeyError}</FormError> : null}
          {authError ? <FormError>{authError}</FormError> : null}

          <Divider label="or" />

          <div className="space-y-2.5">
            <GoogleButton
              href={googleSignInHref}
              onClick={() => {
                setClientLastAuthMethod("google");
                setSelectedMethod("google");
              }}
              badge={lastUsed === "google" ? <LastUsedBadge /> : null}
            />
            <a
              href={googleQuery ? `/auth/github?${googleQuery}` : "/auth/github"}
              className={buttonVariants({ variant: "secondary", className: "w-full gap-3" })}
              onClick={() => {
                setClientLastAuthMethod("github");
                setSelectedMethod("github");
              }}
            >
              <GitHubIcon className="h-[18px] w-[18px]" aria-hidden />
              Continue with GitHub
              {lastUsed === "github" ? <LastUsedBadge /> : null}
            </a>
            {passkeyButton(
              "Sign in with a passkey",
              isUsernamePending,
              lastUsed === "passkey" ? <LastUsedBadge /> : null,
            )}
          </div>
        </div>

        <div className="mt-8 space-y-3 text-center text-sm text-neutral-500">
          <p>
            New to AXUS ID?{" "}
            <Link href={createAccountHref} className={linkClassName}>
              Create an account
            </Link>
          </p>
          {hasExistingAccounts ? (
            <button
              type="button"
              onClick={() => setShowCredentialsForm(false)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-sm font-medium text-neutral-500 transition-colors hover:text-neutral-950",
                focusRing,
              )}
            >
              <ArrowLeft aria-hidden className="h-3.5 w-3.5" />
              Back to signed-in accounts
            </button>
          ) : null}
        </div>
      </AuthShell>
    );
  }

  const normalizedUsername = username.replace(/^@/, "");

  return (
    <AuthShell
      step={oauthStep}
      title={isOAuthFlow ? `Sign in to continue to ${appName}` : "Confirm it’s you"}
      description="Enter your password to finish signing in."
      context={oauthContext}
    >
      <AuthPanelHeading title="Enter your password" />

      <div
        className={cn(
          "mb-5 flex items-center gap-3 border border-black/[0.06] bg-neutral-50 py-2.5 pl-2.5 pr-2",
          roundedRect,
        )}
      >
        <UsernameAvatar size="sm" username={normalizedUsername} />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-neutral-950">
          @{normalizedUsername}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setPasskeyError(null);
            setCredentialStep("identifier");
          }}
          aria-label={`Use a different account than @${normalizedUsername}`}
        >
          Switch
        </Button>
      </div>

      {registeredUsername ? (
        <Alert tone="success" className="mb-5">
          Your account is ready. Sign in with the password you just created.
        </Alert>
      ) : null}

      <form
        action={formAction}
        onSubmit={() => {
          setClientLastAuthMethod("password");
          setSelectedMethod("password");
        }}
        className="space-y-4"
      >
        <input type="hidden" name="username" value={username} />
        {redirectUri ? <input type="hidden" name="redirect_uri" value={redirectUri} /> : null}
        {next ? <input type="hidden" name="next" value={next} /> : null}

        <PasswordInput
          id="login-password"
          name="password"
          label="Password"
          placeholder="Enter your password"
          autoComplete="current-password"
          autoFocus
          required
        />

        {state.error ? <FormError>{state.error}</FormError> : null}
        {passkeyError ? <FormError>{passkeyError}</FormError> : null}

        <Button type="submit" className="w-full" loading={pending} disabled={isPasskeyPending}>
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <div className="mt-4 space-y-4">
        <Divider label="or" />
        {passkeyButton("Use a passkey instead", pending)}
      </div>
    </AuthShell>
  );
}
