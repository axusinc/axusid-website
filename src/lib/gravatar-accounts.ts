import "server-only";

import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { gravatarAccounts } from "@/lib/db/schema";
import { formatSyntheticEmail } from "@/lib/synthetic-email";

export async function registerGravatarAccount(auid: string): Promise<void> {
  const email = formatSyntheticEmail(auid).trim().toLowerCase();
  await getDb().insert(gravatarAccounts).values({
    auid,
    md5: createHash("md5").update(email).digest("hex"),
    sha256: createHash("sha256").update(email).digest("hex"),
  }).onConflictDoNothing();
}

export async function findGravatarAccount(hash: string): Promise<string | null> {
  const column = hash.length === 32 ? gravatarAccounts.md5 : gravatarAccounts.sha256;
  const rows = await getDb().select({ auid: gravatarAccounts.auid }).from(gravatarAccounts)
    .where(eq(column, hash)).limit(1);
  return rows[0]?.auid ?? null;
}
