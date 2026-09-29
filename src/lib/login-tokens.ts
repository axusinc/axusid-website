import "server-only";

import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { loginTokens } from "@/lib/db/schema";
import { publicTokenId } from "@/lib/native-token-id";
import { sha256Base64Url } from "@/lib/oauth/pkce";

export async function trackLoginToken(userAuid: string, bearer: string): Promise<void> {
  const tokenId = publicTokenId(bearer);
  if (!tokenId) return;
  await getDb().insert(loginTokens).values({ tokenId, userAuid, bearerHash: await sha256Base64Url(bearer) }).onConflictDoNothing();
}

export async function listLoginTokenIds(userAuid: string): Promise<string[]> {
  const rows = await getDb().select({ tokenId: loginTokens.tokenId }).from(loginTokens)
    .where(eq(loginTokens.userAuid, userAuid));
  return rows.map((row) => row.tokenId);
}

export async function getLoginTokenHash(userAuid: string, tokenId: string): Promise<string | null> {
  const rows = await getDb().select({ bearerHash: loginTokens.bearerHash }).from(loginTokens)
    .where(and(eq(loginTokens.userAuid, userAuid), eq(loginTokens.tokenId, tokenId))).limit(1);
  return rows[0]?.bearerHash ?? null;
}

export async function forgetLoginToken(userAuid: string, bearer: string): Promise<void> {
  const tokenId = publicTokenId(bearer);
  if (tokenId) await forgetLoginTokenId(userAuid, tokenId);
}

export async function forgetLoginTokenId(userAuid: string, tokenId: string): Promise<void> {
  await getDb().delete(loginTokens).where(and(eq(loginTokens.userAuid, userAuid), eq(loginTokens.tokenId, tokenId)));
}
