import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { checkUsernameAvailabilityAction, suggestUsernameFromEmailAction } from "@/app/actions/auth";
import { resolveAuthenticatedRedirect } from "@/lib/auth-redirect";
import { getValidSession } from "@/lib/session-access";
import { getPendingGoogleRegistration } from "@/lib/google-oauth";
import { getPendingGitHubRegistration } from "@/lib/github-oauth";
import { RegisterForm, type UsernameAvailability } from "./register-form";

export const metadata: Metadata = { title: "Create account" };

type RegisterPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const params = await searchParams;
  const redirectUri = typeof params.redirect_uri === "string" ? params.redirect_uri : undefined;
  const next = typeof params.next === "string" ? params.next : undefined;
  const addAccount = params.add_account === "true";
  const contextAuidParam = params.contextAuid ?? params.context;
  const contextAuid = typeof contextAuidParam === "string" ? contextAuidParam : undefined;
  const authError = typeof params.auth_error === "string" ? params.auth_error : undefined;
  const usernameParam = typeof params.username === "string" ? params.username.trim().replace(/^@/, "") : undefined;

  const session = await getValidSession();
  const pendingGoogle = await getPendingGoogleRegistration();
  const pendingGitHub = pendingGoogle ? null : await getPendingGitHubRegistration();
  let suggestedUsername: string | undefined;
  if (pendingGoogle?.email) {
    suggestedUsername = await suggestUsernameFromEmailAction(pendingGoogle.email);
  } else if (pendingGitHub) {
    if (pendingGitHub.email) {
      suggestedUsername = await suggestUsernameFromEmailAction(pendingGitHub.email);
    }
    if (!suggestedUsername && pendingGitHub.username) {
      const availability = await checkUsernameAvailabilityAction(pendingGitHub.username);
      if (availability.available) {
        suggestedUsername = pendingGitHub.username;
      }
    }
  }

  const initialUsername = usernameParam || suggestedUsername;
  let initialAvailability: UsernameAvailability | undefined;

  if (usernameParam) {
    if (usernameParam.length >= 4) {
      try {
        const check = await checkUsernameAvailabilityAction(usernameParam);
        if (check.available) {
          initialAvailability = { username: usernameParam, status: "available" };
        } else {
          initialAvailability = {
            username: usernameParam,
            status: check.reason === "taken" ? "taken" : "error",
            message:
              check.error ||
              (check.reason === "taken"
                ? "That username is taken."
                : "We couldn’t check that username."),
          };
        }
      } catch {
        initialAvailability = { username: usernameParam, status: "idle" };
      }
    } else {
      initialAvailability = { username: usernameParam, status: "idle" };
    }
  } else if (suggestedUsername) {
    initialAvailability = { username: suggestedUsername, status: "available" };
  }

  if (session && !addAccount && !pendingGoogle && !pendingGitHub && !contextAuid) {
    redirect(resolveAuthenticatedRedirect({ redirectUri, next }));
  }

  return (
    <RegisterForm
      redirectUri={redirectUri}
      next={next}
      contextAuid={contextAuid}
      isAddAccount={addAccount}
      authError={authError}
      initialUsername={initialUsername}
      initialAvailability={initialAvailability}
      pendingGoogle={
        pendingGoogle
          ? {
              email: pendingGoogle.email,
              name: pendingGoogle.name,
              picture: pendingGoogle.picture,
            }
          : null
      }
      pendingGitHub={
        pendingGitHub
          ? {
              username: pendingGitHub.username,
              name: pendingGitHub.name,
              email: pendingGitHub.email,
              picture: pendingGitHub.picture,
            }
          : null
      }
    />
  );
}
