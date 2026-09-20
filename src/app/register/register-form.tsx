"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Dices, X } from "lucide-react";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import {
  checkUsernameAvailabilityAction,
  clearPendingGoogleRegistrationAction,
  registerAction,
  type AuthActionState,
} from "@/app/actions/auth";
import { AuthPanelHeading, AuthShell } from "@/components/auth-shell";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Divider } from "@/components/ui/divider";
import { FormError } from "@/components/ui/form-message";
import { GoogleButton } from "@/components/ui/google-button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Spinner } from "@/components/ui/spinner";
import { focusRing, roundedRect } from "@/lib/design";
import { cn } from "@/lib/utils";

const initialState: AuthActionState = {};

const linkClassName =
  "font-semibold text-neutral-950 underline-offset-4 hover:underline rounded-sm " + focusRing;

type RegisterFormProps = {
  redirectUri?: string;
  next?: string;
  contextAuid?: string;
  isAddAccount?: boolean;
  authError?: string;
  initialUsername?: string;
  pendingGoogle?: {
    email?: string;
    name?: string;
    picture?: string;
  } | null;
};

type RegistrationStage = "identity" | "security";

type UsernameAvailability = {
  username: string;
  status: "idle" | "checking" | "available" | "taken" | "error";
  message?: string;
};

const randomUsernameAdjectives = [
  "bright",
  "calm",
  "clever",
  "cosmic",
  "lucky",
  "modern",
  "swift",
  "vivid",
] as const;

const randomUsernameNouns = [
  "atlas",
  "comet",
  "ember",
  "falcon",
  "harbor",
  "orbit",
  "pixel",
  "summit",
] as const;

function generateRandomUsername() {
  const values = crypto.getRandomValues(new Uint32Array(3));
  const adjective = randomUsernameAdjectives[
    values[0] % randomUsernameAdjectives.length
  ];
  const noun = randomUsernameNouns[values[1] % randomUsernameNouns.length];
  const suffix = String(values[2] % 1000).padStart(3, "0");

  return `${adjective}${noun}${suffix}`;
}

function getPasswordStrength(password: string) {
  if (!password) {
    return { level: 0, label: "", color: "bg-neutral-200" };
  }

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) {
    return { level: 1, label: "Weak", color: "bg-red-500" };
  }

  if (score <= 4) {
    return { level: 2, label: "Good", color: "bg-amber-500" };
  }

  return { level: 3, label: "Strong", color: "bg-emerald-500" };
}

function buildLoginHref({
  redirectUri,
  next,
  addAccount,
}: {
  redirectUri?: string;
  next?: string;
  addAccount?: boolean;
}) {
  const params = new URLSearchParams();

  if (redirectUri) params.set("redirect_uri", redirectUri);
  if (next) params.set("next", next);
  if (addAccount) params.set("add_account", "true");

  const query = params.toString();
  return query ? `/login?${query}` : "/login";
}

function buildGoogleInitHref({
  redirectUri,
  next,
}: {
  redirectUri?: string;
  next?: string;
}) {
  const params = new URLSearchParams();
  if (redirectUri) params.set("redirect_uri", redirectUri);
  if (next) params.set("next", next);

  const query = params.toString();
  return query ? `/auth/google?${query}` : "/auth/google";
}

function PendingGoogleAvatar({
  picture,
  name,
}: {
  picture?: string;
  name?: string;
}) {
  const [imgError, setImgError] = useState(false);

  if (picture && !imgError) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={picture}
        alt={name || "Google avatar"}
        referrerPolicy="no-referrer"
        onError={() => setImgError(true)}
        className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-black/10"
      />
    );
  }

  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-black/10">
      <Image src="/google-g.svg" width={20} height={20} alt="" aria-hidden />
    </span>
  );
}

export function RegisterForm({
  redirectUri,
  next,
  contextAuid,
  isAddAccount = false,
  authError,
  initialUsername,
  pendingGoogle,
}: RegisterFormProps) {
  // Keep the same Google registration key when retrying the server action.
  const googleRegistrationKeyRef = useRef<string | null>(null);
  const [state, formAction, pending] = useActionState(
    (previousState: AuthActionState, formData: FormData) => {
      if (pendingGoogle) {
        googleRegistrationKeyRef.current ??= crypto.randomUUID();
        formData.set("registrationKey", googleRegistrationKeyRef.current);
      }
      return registerAction(previousState, formData);
    },
    initialState,
  );
  const [registrationKey, setRegistrationKey] = useState("");
  const [stage, setStage] = useState<RegistrationStage>("identity");
  const [customUsername, setCustomUsername] = useState(initialUsername ?? "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [isUsernamePending, startUsernameTransition] = useTransition();
  const [isClearGooglePending, startClearGoogleTransition] = useTransition();
  const router = useRouter();
  const [usernameAvailability, setUsernameAvailability] =
    useState<UsernameAvailability>(() =>
      initialUsername
        ? { username: initialUsername, status: "available" }
        : { username: "", status: "idle" },
    );
  const availabilityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const availabilityRequestRef = useRef(0);

  useEffect(() => {
    return () => {
      if (availabilityTimerRef.current) {
        clearTimeout(availabilityTimerRef.current);
      }
      availabilityRequestRef.current += 1;
    };
  }, []);

  const normalizedUsername = customUsername.trim().replace(/^@/, "");
  const strength = getPasswordStrength(password);
  const passwordsMatch = password === confirmPassword;
  const confirmError =
    confirmTouched && confirmPassword && !passwordsMatch
      ? "Passwords don’t match."
      : undefined;
  const signInHref = buildLoginHref({ redirectUri, next, addAccount: isAddAccount });
  const googleInitHref = buildGoogleInitHref({ redirectUri, next });

  const authErrorMessage =
    authError === "google_unavailable"
      ? "Google account creation is currently unavailable. Try again later."
      : authError === "google_cancelled"
        ? "Google sign-up was cancelled."
        : authError === "google_failed"
          ? "We couldn’t sign you up with Google. Try again."
          : authError === "already_linked"
            ? "That Google account is already linked to another AXUS ID."
            : authError === "username_taken"
              ? "That username is taken. Choose another one."
              : authError === "invalid_username"
                ? "Choose a valid username."
                : authError;

  const performUsernameAvailabilityCheck = (
    username: string,
    requestId: number,
    onAvailable?: () => void,
  ) => {
    startUsernameTransition(async () => {
      const result = await checkUsernameAvailabilityAction(username);
      if (requestId !== availabilityRequestRef.current) return;

      if (result.available) {
        setUsernameAvailability({ username, status: "available" });
        onAvailable?.();
        return;
      }

      setUsernameAvailability({
        username,
        status: result.reason === "taken" ? "taken" : "error",
        message:
          result.error ||
          (result.reason === "taken"
            ? "That username is taken."
            : "We couldn’t check that username."),
      });
    });
  };

  const scheduleUsernameAvailabilityCheck = (value: string) => {
    const username = value.trim().replace(/^@/, "");
    if (availabilityTimerRef.current) {
      clearTimeout(availabilityTimerRef.current);
    }

    const requestId = availabilityRequestRef.current + 1;
    availabilityRequestRef.current = requestId;

    if (!username) {
      setUsernameAvailability({ username: "", status: "idle" });
      return;
    }

    setUsernameAvailability({ username, status: "checking" });
    availabilityTimerRef.current = setTimeout(() => {
      availabilityTimerRef.current = null;
      performUsernameAvailabilityCheck(username, requestId);
    }, 450);
  };

  const footerContent = (
    <p className="mt-8 text-center text-sm text-neutral-500">
      Already have an AXUS ID?{" "}
      <Link href={signInHref} className={linkClassName}>
        Sign in
      </Link>
    </p>
  );

  const isCheckingUsername = isUsernamePending || usernameAvailability.status === "checking";
  const usernameStatusIcon =
    usernameAvailability.status === "checking" ? (
      <span className="flex h-8 w-8 items-center justify-center text-neutral-400" title="Checking availability">
        <Spinner />
      </span>
    ) : usernameAvailability.status === "available" ? (
      <span className="flex h-8 w-8 items-center justify-center text-emerald-600" title="Username is available">
        <Check aria-hidden className="h-4 w-4" strokeWidth={2.5} />
      </span>
    ) : usernameAvailability.status === "taken" || usernameAvailability.status === "error" ? (
      <span
        className={cn(
          "flex h-8 w-8 items-center justify-center",
          usernameAvailability.status === "taken" ? "text-red-600" : "text-amber-600",
        )}
        title={usernameAvailability.message}
      >
        <X aria-hidden className="h-4 w-4" strokeWidth={2.5} />
      </span>
    ) : null;

  const usernameHint =
    usernameAvailability.status === "available" && normalizedUsername
      ? <span className="text-emerald-700">@{normalizedUsername} is available.</span>
      : usernameAvailability.status === "taken" || usernameAvailability.status === "error"
        ? <span className="text-red-600">{usernameAvailability.message}</span>
        : "At least 4 characters. Letters, numbers and underscores work best.";

  if (stage === "identity") {
    return (
      <AuthShell
        step={pendingGoogle ? undefined : { current: 1, total: 2 }}
        title={contextAuid ? "Create another identity" : "Create your AXUS ID"}
        description={
          pendingGoogle
            ? "Pick a username and you’re done. Your Google account will be linked for sign-in."
            : "One account for every app that supports AXUS ID. It takes less than a minute."
        }
      >
        {pendingGoogle ? (
          <div
            className={cn(
              "mb-6 flex items-center gap-3 border border-black/[0.06] bg-neutral-50 p-3",
              roundedRect,
            )}
          >
            <PendingGoogleAvatar picture={pendingGoogle.picture} name={pendingGoogle.name} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-neutral-500">Signing up with Google</p>
              <p className="truncate text-sm font-semibold text-neutral-950">
                {pendingGoogle.name || pendingGoogle.email || "Google account"}
              </p>
              {pendingGoogle.email && pendingGoogle.name ? (
                <p className="truncate text-xs text-neutral-500">{pendingGoogle.email}</p>
              ) : null}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => {
                startClearGoogleTransition(async () => {
                  await clearPendingGoogleRegistrationAction();
                  const params = new URLSearchParams();
                  if (redirectUri) params.set("redirect_uri", redirectUri);
                  if (next) params.set("next", next);
                  if (isAddAccount) params.set("add_account", "true");
                  if (contextAuid) params.set("contextAuid", contextAuid);
                  const query = params.toString();
                  router.push(query ? `/register?${query}` : "/register");
                });
              }}
              aria-label="Cancel Google sign-up"
              title="Cancel Google sign-up"
              loading={isClearGooglePending}
            >
              {isClearGooglePending ? null : <X aria-hidden className="h-4 w-4" />}
            </Button>
          </div>
        ) : null}

        <AuthPanelHeading
          title="Choose your username"
          description={
            contextAuid
              ? "This identity will live alongside your current account."
              : "This is how you’ll sign in. You can change it later."
          }
        />

        <form
          action={pendingGoogle ? formAction : undefined}
          className="space-y-4"
          aria-busy={isCheckingUsername || pending}
          noValidate
          onSubmit={(event) => {
            if (pendingGoogle) {
              if (!normalizedUsername) {
                event.preventDefault();
                setUsernameError("Enter a username.");
                return;
              }
              if (normalizedUsername.length < 4) {
                event.preventDefault();
                setUsernameError("Username must be at least 4 characters long.");
                return;
              }
              return;
            }

            event.preventDefault();

            const continueToSecurity = () => {
              setCustomUsername(normalizedUsername);
              setRegistrationKey((currentKey) => currentKey || crypto.randomUUID());
              setStage("security");
            };

            if (!normalizedUsername) {
              setUsernameError("Enter a username.");
              return;
            }

            if (normalizedUsername.length < 4) {
              setUsernameError("Username must be at least 4 characters long.");
              return;
            }

            if (
              usernameAvailability.username === normalizedUsername &&
              usernameAvailability.status === "available"
            ) {
              continueToSecurity();
              return;
            }

            if (availabilityTimerRef.current) {
              clearTimeout(availabilityTimerRef.current);
              availabilityTimerRef.current = null;
            }

            const requestId = availabilityRequestRef.current + 1;
            availabilityRequestRef.current = requestId;
            setUsernameError(null);
            setUsernameAvailability({
              username: normalizedUsername,
              status: "checking",
            });
            performUsernameAvailabilityCheck(
              normalizedUsername,
              requestId,
              continueToSecurity,
            );
          }}
        >
          {pendingGoogle ? (
            <>
              <input type="hidden" name="username" value={normalizedUsername} />
              {redirectUri ? <input type="hidden" name="redirect_uri" value={redirectUri} /> : null}
              {next ? <input type="hidden" name="next" value={next} /> : null}
              {contextAuid ? <input type="hidden" name="contextAuid" value={contextAuid} /> : null}
            </>
          ) : null}

          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
            <Input
              id="register-username"
              name={pendingGoogle ? undefined : "username"}
              label="Username"
              value={customUsername}
              onChange={(event) => {
                const value = event.target.value;
                setCustomUsername(value);
                setUsernameError(null);
                scheduleUsernameAvailabilityCheck(value);
              }}
              error={usernameError || undefined}
              hint={usernameHint}
              placeholder="your-username"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              minLength={4}
              autoFocus
              required
              trailing={usernameStatusIcon}
            />

            <Button
              type="button"
              variant="secondary"
              className="mt-[26px] px-3.5"
              onClick={() => {
                const suggestion = generateRandomUsername();
                setCustomUsername(suggestion);
                setUsernameError(null);
                scheduleUsernameAvailabilityCheck(suggestion);
              }}
              title="Suggest a random username"
            >
              <Dices aria-hidden className="h-4 w-4" />
              <span className="hidden min-[400px]:inline">Suggest</span>
            </Button>
          </div>

          <span className="sr-only" aria-live="polite" aria-atomic="true">
            {usernameAvailability.status === "checking"
              ? "Checking username availability"
              : usernameAvailability.status === "available"
                ? "Username is available"
                : usernameAvailability.status === "taken" ||
                    usernameAvailability.status === "error"
                  ? usernameAvailability.message
                  : ""}
          </span>

          {state.error ? <FormError>{state.error}</FormError> : null}
          {authErrorMessage ? <FormError>{authErrorMessage}</FormError> : null}

          <Button
            type="submit"
            className="w-full"
            loading={pending || isCheckingUsername}
            disabled={usernameAvailability.status === "taken"}
          >
            {pending
              ? "Creating your account…"
              : isCheckingUsername
                ? "Checking username…"
                : pendingGoogle
                  ? contextAuid
                    ? "Create identity"
                    : "Create AXUS ID"
                  : "Continue"}
          </Button>

          {!pendingGoogle ? (
            <>
              <Divider label="or" />
              <GoogleButton href={googleInitHref} label="Sign up with Google" />
            </>
          ) : null}
        </form>
        {footerContent}
      </AuthShell>
    );
  }

  return (
    <AuthShell
      step={{ current: 2, total: 2 }}
      title="Secure your account"
      description="Set a password now. You can add a passkey for faster, phishing-resistant sign-in once you’re in."
    >
      <AuthPanelHeading title="Create a password" />

      <div
        className={cn(
          "mb-5 flex items-center gap-3 border border-black/[0.06] bg-neutral-50 py-2.5 pl-2.5 pr-2",
          roundedRect,
        )}
      >
        <Avatar size="sm" username={normalizedUsername} displayName={normalizedUsername} />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-neutral-950">
          @{normalizedUsername}
        </span>
        <Button type="button" variant="ghost" size="sm" onClick={() => setStage("identity")} disabled={pending}>
          Change
        </Button>
      </div>

      <form
        action={formAction}
        className="space-y-4"
        aria-busy={pending}
        onSubmit={(event) => {
          setConfirmTouched(true);
          if (!passwordsMatch) event.preventDefault();
        }}
      >
        <input type="hidden" name="registrationKey" value={registrationKey} />
        <input type="hidden" name="username" value={normalizedUsername} />
        {redirectUri ? (
          <input type="hidden" name="redirect_uri" value={redirectUri} />
        ) : null}
        {next ? <input type="hidden" name="next" value={next} /> : null}
        {contextAuid ? (
          <input type="hidden" name="contextAuid" value={contextAuid} />
        ) : null}

        <div>
          <PasswordInput
            id="register-password"
            name="password"
            label="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            visible={showPassword}
            onVisibleChange={setShowPassword}
            placeholder="Create a password"
            autoComplete="new-password"
            autoFocus
            required
          />

          <div className="mt-2.5 space-y-1.5" aria-live="polite">
            <div className="grid grid-cols-3 gap-1.5" aria-hidden>
              {[1, 2, 3].map((segment) => (
                <span
                  key={segment}
                  className={cn(
                    "h-1 rounded-full transition-colors duration-300",
                    segment <= strength.level ? strength.color : "bg-neutral-200/70",
                  )}
                />
              ))}
            </div>
            <p className="flex justify-between gap-3 text-[13px] text-neutral-500">
              <span>Use 8+ characters with a mix of letters, numbers and symbols.</span>
              {strength.label ? (
                <span className="shrink-0 font-medium text-neutral-800">{strength.label}</span>
              ) : null}
            </p>
          </div>
        </div>

        <PasswordInput
          id="register-confirm-password"
          name="confirmPassword"
          label="Confirm password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          onBlur={() => setConfirmTouched(true)}
          visible={showPassword}
          onVisibleChange={setShowPassword}
          error={confirmError}
          placeholder="Repeat your password"
          autoComplete="new-password"
          required
        />

        {state.error ? <FormError>{state.error}</FormError> : null}
        {authErrorMessage ? <FormError>{authErrorMessage}</FormError> : null}

        <div className="flex gap-2.5 pt-1">
          <Button
            type="button"
            variant="secondary"
            className="w-11 px-0"
            onClick={() => setStage("identity")}
            disabled={pending}
            aria-label="Back to username"
          >
            <ArrowLeft aria-hidden className="h-4 w-4" />
          </Button>
          <Button
            type="submit"
            className="flex-1"
            loading={pending}
            disabled={!registrationKey || !password || !confirmPassword || !passwordsMatch}
          >
            {pending
              ? "Creating your account…"
              : contextAuid
                ? "Create identity"
                : "Create AXUS ID"}
          </Button>
        </div>
      </form>
      {footerContent}
    </AuthShell>
  );
}
