import "server-only";

import { and, eq, isNull, lt } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { oauthAuthorizationCodes } from "@/lib/db/schema";

export type AuthorizationCodeRecord = {
  code: string;
  clientAuid: string;
  redirectUri: string;
  scopes: string[];
  userAuid: string;
  /** The authorization this code hands over. */
  grantId: string;
  codeChallenge?: string;
  codeChallengeMethod?: "S256";
  nonce?: string;
  expiresAt: Date;
};

export const AUTH_CODE_TTL_MS = 5 * 60 * 1000;

export async function saveAuthorizationCode(
  record: AuthorizationCodeRecord,
): Promise<void> {
  const db = getDb();

  await db.insert(oauthAuthorizationCodes).values({
    code: record.code,
    clientAuid: record.clientAuid,
    redirectUri: record.redirectUri,
    scopes: record.scopes,
    userAuid: record.userAuid,
    grantId: record.grantId,
    codeChallenge: record.codeChallenge ?? null,
    nonce: record.nonce ?? null,
    expiresAt: record.expiresAt,
  });
}

export async function consumeAuthorizationCode(
  code: string,
): Promise<AuthorizationCodeRecord | undefined> {
  const db = getDb();
  const now = new Date();

  const rows = await db
    .select()
    .from(oauthAuthorizationCodes)
    .where(
      and(
        eq(oauthAuthorizationCodes.code, code),
        isNull(oauthAuthorizationCodes.consumedAt),
      ),
    )
    .limit(1);

  const row = rows[0];
  if (!row || row.expiresAt <= now) {
    return undefined;
  }

  await db
    .update(oauthAuthorizationCodes)
    .set({ consumedAt: now })
    .where(eq(oauthAuthorizationCodes.code, code));

  return {
    code: row.code,
    clientAuid: row.clientAuid,
    redirectUri: row.redirectUri,
    scopes: row.scopes,
    userAuid: row.userAuid,
    grantId: row.grantId,
    codeChallenge: row.codeChallenge ?? undefined,
    codeChallengeMethod: row.codeChallenge ? "S256" : undefined,
    nonce: row.nonce ?? undefined,
    expiresAt: row.expiresAt,
  };
}

export async function purgeExpiredAuthorizationCodes(): Promise<void> {
  const db = getDb();
  await db
    .delete(oauthAuthorizationCodes)
    .where(lt(oauthAuthorizationCodes.expiresAt, new Date()));
}
