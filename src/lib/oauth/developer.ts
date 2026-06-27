import "server-only";

import { redirect } from "next/navigation";
import { getValidSession } from "@/lib/session-access";
import type { IdPSession } from "@/lib/session";

export async function requireDeveloperSession(): Promise<IdPSession> {
  const session = await getValidSession();

  if (!session) {
    redirect("/login?next=/developer/oauth/clients");
  }

  return session;
}
