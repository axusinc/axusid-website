import { LoginForm } from "./login-form";

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function pickOAuthParams(
  searchParams: Record<string, string | string[] | undefined>,
): Record<string, string> | undefined {
  if (searchParams.oauth !== "1") {
    return undefined;
  }

  const keys = [
    "response_type",
    "client_id",
    "redirect_uri",
    "scope",
    "state",
    "code_challenge",
    "code_challenge_method",
  ] as const;

  const params: Record<string, string> = {};
  for (const key of keys) {
    const value = searchParams[key];
    if (typeof value === "string" && value.length > 0) {
      params[key] = value;
    }
  }

  return Object.keys(params).length > 0 ? params : undefined;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const oauthParams = pickOAuthParams(params);
  const registered =
    typeof params.registered === "string" ? params.registered : undefined;

  return <LoginForm oauthParams={oauthParams} registeredUsername={registered} />;
}
