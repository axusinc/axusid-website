"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Dices,
  Eye,
  EyeOff,
  LoaderCircle,
  UserRound,
  X,
} from "lucide-react";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import {
  checkUsernameAvailabilityAction,
  registerAction,
  type AuthActionState,
} from "@/app/actions/auth";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { roundedRect } from "@/lib/design";
import { cn } from "@/lib/utils";

const initialState: AuthActionState = {};

type RegisterFormProps = {
  redirectUri?: string;
  next?: string;
  contextAuid?: string;
  isAddAccount?: boolean;
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
    return { level: 1, label: "Weak", color: "bg-amber-500" };
  }

  if (score <= 4) {
    return { level: 2, label: "Good", color: "bg-blue-500" };
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

export function RegisterForm({
  redirectUri,
  next,
  contextAuid,
  isAddAccount = false,
}: RegisterFormProps) {
  const [state, formAction, pending] = useActionState(
    registerAction,
    initialState,
  );
  const [registrationKey, setRegistrationKey] = useState("");
  const [stage, setStage] = useState<RegistrationStage>("identity");
  const [customUsername, setCustomUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [isUsernamePending, startUsernameTransition] = useTransition();
  const [usernameAvailability, setUsernameAvailability] =
    useState<UsernameAvailability>({ username: "", status: "idle" });
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
            ? "That username is already in use."
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

  const footer = (
    <>
      Already have an account?{" "}
      <Link
        href={signInHref}
        className="font-semibold text-black underline-offset-4 hover:underline"
      >
        Sign in
      </Link>
    </>
  );

  if (stage === "identity") {
    return (
      <AuthShell
        variant="sign-in"
        signInStep={1}
        maxWidthClass="max-w-[920px]"
        title={contextAuid ? "Create another identity" : "Create your AXUS ID"}
        description="Choose how people will find you. You’ll secure your account with a password next."
        footer={footer}
      >
        <div className="mb-7">
          <h2 className="text-xl font-semibold tracking-tight text-black">
            Choose your username
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-neutral-500">
            Pick something memorable, or generate a fresh suggestion.
          </p>
        </div>

        <form
          className="space-y-5"
          aria-busy={
            isUsernamePending || usernameAvailability.status === "checking"
          }
          onSubmit={(event) => {
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
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
            <div className="relative">
              <Input
                id="register-username"
                name="username"
                label="Username"
                value={customUsername}
                onChange={(event) => {
                  const value = event.target.value;
                  setCustomUsername(value);
                  setUsernameError(null);
                  scheduleUsernameAvailabilityCheck(value);
                }}
                error={usernameError || undefined}
                placeholder="Choose a username"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                minLength={4}
                autoFocus
                required
                className="pr-11"
              />

              {usernameAvailability.status === "checking" ? (
                <span
                  className="absolute right-3 top-[34px] flex h-7 w-7 items-center justify-center text-neutral-400"
                  title="Checking availability"
                >
                  <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
                </span>
              ) : usernameAvailability.status === "available" ? (
                <span
                  className="absolute right-3 top-[34px] flex h-7 w-7 items-center justify-center text-emerald-600"
                  title="Username is available"
                >
                  <Check aria-hidden="true" className="h-4.5 w-4.5" strokeWidth={2.5} />
                </span>
              ) : usernameAvailability.status === "taken" ? (
                <span
                  className="absolute right-3 top-[34px] flex h-7 w-7 items-center justify-center text-red-600"
                  title={usernameAvailability.message}
                >
                  <X aria-hidden="true" className="h-4.5 w-4.5" strokeWidth={2.5} />
                </span>
              ) : usernameAvailability.status === "error" ? (
                <span
                  className="absolute right-3 top-[34px] flex h-7 w-7 items-center justify-center text-amber-600"
                  title={usernameAvailability.message}
                >
                  <X aria-hidden="true" className="h-4.5 w-4.5" strokeWidth={2.5} />
                </span>
              ) : null}

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
            </div>

            <Button
              type="button"
              variant="outline"
              className="h-11 gap-2 px-3.5"
              onClick={() => {
                const suggestion = generateRandomUsername();
                setCustomUsername(suggestion);
                setUsernameError(null);
                scheduleUsernameAvailabilityCheck(suggestion);
              }}
            >
              <Dices aria-hidden="true" className="h-4 w-4" />
              Random
            </Button>
          </div>

          <div
            className={cn(
              "flex gap-3 border border-black/[0.06] bg-neutral-50/80 px-4 py-3.5",
              roundedRect,
            )}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/[0.05] text-neutral-600">
              <UserRound aria-hidden="true" className="h-4 w-4" />
            </span>
            <div className="pt-0.5">
              <p className="text-sm font-medium text-black">
                {contextAuid ? "Connected to your account" : "You can change this later"}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-neutral-500">
                {contextAuid
                  ? "This new identity will be available alongside your current one."
                  : "Your username is public, unique, and can be changed later."}
              </p>
            </div>
          </div>

          <Button
            type="submit"
            variant="brand"
            className="h-11 w-full text-sm font-semibold shadow-sm"
            disabled={
              isUsernamePending ||
              usernameAvailability.status === "checking" ||
              usernameAvailability.status === "taken"
            }
          >
            {isUsernamePending || usernameAvailability.status === "checking" ? (
              <>
                <LoaderCircle
                  aria-hidden="true"
                  className="mr-2 h-4 w-4 animate-spin"
                />
                Checking username…
              </>
            ) : (
              "Continue"
            )}
          </Button>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      variant="sign-in"
      signInStep={2}
      maxWidthClass="max-w-[920px]"
      title="Secure your account"
      description="Create a password for your new AXUS ID. Make it unique to this account."
      footer={footer}
    >
      <button
        type="button"
        onClick={() => setStage("identity")}
        className={cn(
          "mb-7 flex w-full items-center gap-3 border border-black/[0.06] bg-neutral-50/80 px-4 py-3 text-left transition-colors hover:border-black/10 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black/5",
          roundedRect,
        )}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/[0.06] text-neutral-700">
          <UserRound aria-hidden="true" className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-medium text-neutral-500">Username</span>
          <span className="block truncate text-sm font-semibold text-black">
            {normalizedUsername ? `@${normalizedUsername}` : "Assigned automatically"}
          </span>
        </span>
        <span className="text-xs font-semibold text-neutral-500">Change</span>
      </button>

      <form
        action={formAction}
        className="space-y-5"
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

        <div className="space-y-4">
          <div className="relative">
            <Input
              id="register-password"
              name="password"
              label="Password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Create a password"
              autoComplete="new-password"
              className="pr-12"
              autoFocus
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              className="absolute right-3 top-[34px] flex h-7 w-7 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-black/[0.05] hover:text-black focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black/5"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff aria-hidden="true" className="h-4 w-4" />
              ) : (
                <Eye aria-hidden="true" className="h-4 w-4" />
              )}
            </button>
          </div>

          {password ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-neutral-500">
                <span>Password strength</span>
                <span className="font-semibold text-neutral-700">{strength.label}</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5" aria-label={`${strength.label} password`}>
                {[1, 2, 3].map((segment) => (
                  <span
                    key={segment}
                    className={cn(
                      "h-1.5 rounded-full transition-colors",
                      segment <= strength.level ? strength.color : "bg-neutral-100",
                    )}
                  />
                ))}
              </div>
              <p className="text-xs leading-relaxed text-neutral-500">
                Use 8 or more characters. Numbers, symbols, and uppercase letters make it stronger.
              </p>
            </div>
          ) : null}

          <Input
            id="register-confirm-password"
            name="confirmPassword"
            label="Confirm password"
            type={showPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            onBlur={() => setConfirmTouched(true)}
            error={confirmError}
            placeholder="Repeat your password"
            autoComplete="new-password"
            required
          />
        </div>

        {pending ? (
          <div
            className={cn(
              "flex items-center gap-3 border border-black/[0.06] bg-neutral-50/80 px-4 py-3.5",
              roundedRect,
            )}
          >
            <LoaderCircle
              aria-hidden="true"
              className="h-5 w-5 shrink-0 animate-spin text-neutral-600"
            />
            <div>
              <p className="text-sm font-medium text-black">Creating your AXUS ID</p>
              <p className="mt-0.5 text-xs text-neutral-500">
                This usually takes only a few seconds.
              </p>
            </div>
          </div>
        ) : null}

        {state.error ? <FormError>{state.error}</FormError> : null}

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            className="h-11 w-12 shrink-0 px-0"
            onClick={() => setStage("identity")}
            disabled={pending}
            aria-label="Back to username"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          </Button>
          <Button
            type="submit"
            variant="brand"
            className="h-11 flex-1 text-sm font-semibold shadow-sm"
            disabled={
              pending || !registrationKey || !password || !confirmPassword || !passwordsMatch
            }
          >
            {pending
              ? "Creating account…"
              : contextAuid
                ? "Create identity"
                : "Create AXUS ID"}
          </Button>
        </div>
      </form>
    </AuthShell>
  );
}
