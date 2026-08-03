import { redirect } from "next/navigation";
import { resolveAuthenticatedRedirect } from "@/lib/auth-redirect";
import { getValidSession } from "@/lib/session-access";
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

  const session = await getValidSession();
  if (session && !addAccount) {
    redirect(resolveAuthenticatedRedirect({ redirectUri, next }));
  }

  return (
    <RegisterForm
      redirectUri={redirectUri}
      next={next}
      contextAuid={contextAuid}
      isAddAccount={addAccount}
    />
  );
}
