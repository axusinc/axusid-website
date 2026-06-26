import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { ConsentForm } from "./consent-form";
import {
  getOAuthClient,
  normalizeScopes,
  validateScopes,
} from "@/lib/oauth/clients";
import { authorizeQuerySchema } from "@/lib/oauth/schemas";
import { SESSION_COOKIE, getSession } from "@/lib/session";

type ConsentPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ConsentPage({ searchParams }: ConsentPageProps) {
  const params = await searchParams;
  const raw = Object.fromEntries(
    Object.entries(params).flatMap(([key, value]) =>
      typeof value === "string" ? [[key, value]] : [],
    ),
  );

  const parsed = authorizeQuerySchema.safeParse(raw);
  if (!parsed.success) {
    redirect("/login");
  }

  const query = parsed.data;
  const client = getOAuthClient(query.client_id);
  if (!client) {
    redirect("/login");
  }

  const cookieStore = await cookies();
  const session = await getSession(cookieStore.get(SESSION_COOKIE)?.value);

  if (!session) {
    redirect("/login");
  }

  let scopes: string[];
  try {
    scopes = validateScopes(client, normalizeScopes(query.scope));
  } catch {
    redirect("/login");
  }

  const oauthParams: Record<string, string> = {};
  for (const [key, value] of Object.entries(query)) {
    if (value) {
      oauthParams[key] = value;
    }
  }

  return (
    <ConsentForm
      clientName={client.name}
      scopes={scopes}
      oauthParams={oauthParams}
    />
  );
}
