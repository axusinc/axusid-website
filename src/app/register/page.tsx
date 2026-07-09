import { RegisterForm } from "./register-form";

type RegisterPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const params = await searchParams;
  const redirectUrl = typeof params.redirect_url === "string" ? params.redirect_url : undefined;
  return <RegisterForm redirectUrl={redirectUrl} />;
}
