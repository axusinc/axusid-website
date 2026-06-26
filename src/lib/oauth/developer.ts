import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, getSession, type IdPSession } from "@/lib/session";

export async function requireDeveloperSession(): Promise<IdPSession> {
  const cookieStore = await cookies();
  const session = await getSession(cookieStore.get(SESSION_COOKIE)?.value);

  if (!session) {
    redirect("/login?next=/developer/oauth/clients");
  }

  return session;
}
