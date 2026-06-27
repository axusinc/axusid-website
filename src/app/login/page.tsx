import { LoginForm } from "./login-form";

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const isOAuthFlow = params.oauth === "1";
  const registered =
    typeof params.registered === "string" ? params.registered : undefined;

  return (
    <LoginForm isOAuthFlow={isOAuthFlow} registeredUsername={registered} />
  );
}
