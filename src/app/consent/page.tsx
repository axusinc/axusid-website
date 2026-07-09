import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { ConsentForm } from "./consent-form";
import {
  getOAuthClient,
  normalizeScopes,
  validateScopes,
} from "@/lib/oauth/clients";
import { getPendingOAuth } from "@/lib/pending-oauth";
import { buildLoginOAuthUrl } from "@/lib/oauth/schemas";
import { getValidSession } from "@/lib/session-access";

type ConsentPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ConsentPage({ searchParams }: ConsentPageProps) {
  const params = await searchParams;
  const authReq = typeof params.auth_req === "string" ? params.auth_req : undefined;

  const session = await getValidSession();
  if (!session) {
    redirect(buildLoginOAuthUrl(authReq));
  }

  if (!authReq) {
    redirect(buildLoginOAuthUrl());
  }

  const pendingOAuth = await getPendingOAuth(authReq);

  if (!pendingOAuth) {
    redirect(buildLoginOAuthUrl());
  }

  const client = await getOAuthClient(pendingOAuth.client_id);
  if (!client) {
    redirect(buildLoginOAuthUrl());
  }

  let scopes: string[];
  try {
    scopes = validateScopes(client, normalizeScopes(pendingOAuth.scope));
  } catch {
    redirect(buildLoginOAuthUrl());
  }

  return <ConsentForm clientName={client.name} scopes={scopes} authReq={authReq} />;
}
