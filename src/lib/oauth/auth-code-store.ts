import "server-only";

import { and, eq, isNull, lt } from "drizzle-orm";
import type { AuthCredentials } from "@/lib/auth-graphql";
import { decryptJson, encryptJson } from "@/lib/crypto/secret-box";
import { getDb } from "@/lib/db";
import { oauthAuthorizationCodes } from "@/lib/db/schema";

export type AuthorizationCodeRecord = {
  code: string;
  clientId: string;
  redirectUri: string;
  scopes: string[];
  auid: string;
  credentials: AuthCredentials;
  codeChallenge: string;
  codeChallengeMethod: "S256";
  expiresAt: Date;
};

export const AUTH_CODE_TTL_MS = 5 * 60 * 1000;

export async function saveAuthorizationCode(
  record: AuthorizationCodeRecord,
): Promise<void> {
  const db = getDb();
  const encryptedCredentials = await encryptJson(record.credentials);

  await db.insert(oauthAuthorizationCodes).values({
    code: record.code,
    clientId: record.clientId,
    redirectUri: record.redirectUri,
    scopes: record.scopes,
    auid: record.auid,
    credentials: encryptedCredentials,
    codeChallenge: record.codeChallenge,
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

  const credentials =
    typeof row.credentials === "string"
      ? await decryptJson<AuthCredentials>(row.credentials)
      : (row.credentials as AuthCredentials);

  return {
    code: row.code,
    clientId: row.clientId,
    redirectUri: row.redirectUri,
    scopes: row.scopes,
    auid: row.auid,
    credentials,
    codeChallenge: row.codeChallenge,
    codeChallengeMethod: "S256",
    expiresAt: row.expiresAt,
  };
}

export async function purgeExpiredAuthorizationCodes(): Promise<void> {
  const db = getDb();
  await db
    .delete(oauthAuthorizationCodes)
    .where(lt(oauthAuthorizationCodes.expiresAt, new Date()));
}
