import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { ConsentForm } from "./consent-form";
import {
  getOAuthClient,
  normalizeScopes,
  validateScopes,
} from "@/lib/oauth/clients";
import {
  PENDING_OAUTH_COOKIE,
  resolvePendingOAuth,
} from "@/lib/pending-oauth";
import { buildLoginOAuthUrl } from "@/lib/oauth/schemas";
import { getValidSession } from "@/lib/session-access";

export default async function ConsentPage() {
  const cookieStore = await cookies();
  const session = await getValidSession();

  if (!session) {
    redirect(buildLoginOAuthUrl());
  }

  const pendingOAuth = await resolvePendingOAuth(
    cookieStore.get(PENDING_OAUTH_COOKIE)?.value,
    session,
  );

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

  return <ConsentForm clientName={client.name} scopes={scopes} />;
}
