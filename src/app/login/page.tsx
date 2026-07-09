import { LoginForm } from "./login-form";

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const redirectUrl = typeof params.redirect_url === "string" ? params.redirect_url : undefined;
  const isOAuthFlow = !!redirectUrl?.startsWith("/authorize");
  const registered =
    typeof params.registered === "string" ? params.registered : undefined;

  return (
    <LoginForm
      isOAuthFlow={isOAuthFlow}
      registeredUsername={registered}
      redirectUrl={redirectUrl}
    />
  );
}
