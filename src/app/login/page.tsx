import { LoginForm } from "./login-form";

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const redirectUri = typeof params.redirect_uri === "string" ? params.redirect_uri : undefined;
  const isOAuthFlow = !!redirectUri?.startsWith("/authorize");
  const registered =
    typeof params.registered === "string" ? params.registered : undefined;

  return (
    <LoginForm
      isOAuthFlow={isOAuthFlow}
      registeredUsername={registered}
      redirectUri={redirectUri}
    />
  );
}
