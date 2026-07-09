import { redirect } from "next/navigation";
import { resolveAuthenticatedRedirect } from "@/lib/auth-redirect";
import { getValidSession } from "@/lib/session-access";
import { LoginForm } from "./login-form";

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const redirectUri = typeof params.redirect_uri === "string" ? params.redirect_uri : undefined;
  const next = typeof params.next === "string" ? params.next : undefined;
  const isOAuthFlow = !!redirectUri?.startsWith("/authorize");
  const registered =
    typeof params.registered === "string" ? params.registered : undefined;

  const session = await getValidSession();
  if (session) {
    redirect(resolveAuthenticatedRedirect({ redirectUri, next }));
  }

  return (
    <LoginForm
      isOAuthFlow={isOAuthFlow}
      registeredUsername={registered}
      redirectUri={redirectUri}
      next={next}
    />
  );
}
