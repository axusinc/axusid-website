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
  const redirectUri = typeof params.redirect_uri === "string" ? params.redirect_uri : undefined;

  const session = await getValidSession();
  if (!session) {
    redirect(`/login?redirect_uri=${encodeURIComponent(redirectUri ?? "/consent")}`);
  }

  if (!redirectUri || !redirectUri.startsWith("/") || redirectUri.startsWith("//")) {
    redirect("/");
  }

  let url: URL;
  try {
    url = new URL(redirectUri, "http://localhost");
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

  return <ConsentForm clientName={client.name} scopes={scopes} redirectUri={redirectUri} />;
}
