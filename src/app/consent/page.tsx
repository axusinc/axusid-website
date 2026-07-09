import { redirect } from "next/navigation";
import { ConsentForm } from "./consent-form";
import {
  getOAuthClient,
  normalizeScopes,
  validateScopes,
} from "@/lib/oauth/clients";
import { getValidSession } from "@/lib/session-access";

type ConsentPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ConsentPage({ searchParams }: ConsentPageProps) {
  const params = await searchParams;
  const redirectUrl = typeof params.redirect_url === "string" ? params.redirect_url : undefined;

  const session = await getValidSession();
  if (!session) {
    redirect(`/login?redirect_url=${encodeURIComponent(redirectUrl ?? "/consent")}`);
  }

  if (!redirectUrl || !redirectUrl.startsWith("/") || redirectUrl.startsWith("//")) {
    redirect("/");
  }

  let url: URL;
  try {
    url = new URL(redirectUrl, "http://localhost");
  } catch {
    redirect("/");
  }

  const clientId = url.searchParams.get("client_id");
  const scopeParam = url.searchParams.get("scope");

  if (!clientId) {
    redirect("/");
  }

  const client = await getOAuthClient(clientId);
  if (!client) {
    redirect("/");
  }

  let scopes: string[];
  try {
    scopes = validateScopes(client, normalizeScopes(scopeParam ?? ""));
  } catch {
    redirect("/");
  }

  return <ConsentForm clientName={client.name} scopes={scopes} redirectUrl={redirectUrl} />;
}
