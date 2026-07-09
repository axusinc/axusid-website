import { RegisterForm } from "./register-form";

type RegisterPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const params = await searchParams;
  const redirectUri = typeof params.redirect_uri === "string" ? params.redirect_uri : undefined;
  return <RegisterForm redirectUri={redirectUri} />;
}
