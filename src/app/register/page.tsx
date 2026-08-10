import { redirect } from "next/navigation";
import { suggestUsernameFromEmailAction } from "@/app/actions/auth";
import { resolveAuthenticatedRedirect } from "@/lib/auth-redirect";
import { getValidSession } from "@/lib/session-access";
import { getPendingGoogleRegistration } from "@/lib/google-oauth";
import { RegisterForm } from "./register-form";

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

  const session = await getValidSession();
  const pendingGoogle = await getPendingGoogleRegistration();
  const suggestedUsername = pendingGoogle?.email
    ? await suggestUsernameFromEmailAction(pendingGoogle.email)
    : undefined;

  if (session && !addAccount && !pendingGoogle && !contextAuid) {
    redirect(resolveAuthenticatedRedirect({ redirectUri, next }));
  }

  return (
    <RegisterForm
      redirectUri={redirectUri}
      next={next}
      contextAuid={contextAuid}
      isAddAccount={addAccount}
      authError={authError}
      initialUsername={suggestedUsername}
      pendingGoogle={
        pendingGoogle
          ? {
              email: pendingGoogle.email,
              name: pendingGoogle.name,
              picture: pendingGoogle.picture,
            }
          : null
      }
    />
  );
}
