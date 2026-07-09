import "server-only";

import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { oauthClients, type OAuthClientRow } from "@/lib/db/schema";
import type { OAuthClient } from "@/lib/oauth/constants";

function rowToClient(row: OAuthClientRow): OAuthClient {
  return {
    auid: row.auid,
    redirectUris: row.redirectUris,
    allowedScopes: row.allowedScopes,
  };
}

export async function getClientById(
  auid: string,
): Promise<OAuthClient | undefined> {
  const db = getDb();
  const rows = await db
    .select()
    .from(oauthClients)
    .where(eq(oauthClients.auid, auid))
    .limit(1);

  return rows[0] ? rowToClient(rows[0]) : undefined;
}

export async function listClientsByOwner(auid: string): Promise<OAuthClient[]> {
  const client = await getClientById(auid);
  return client ? [client] : [];
}

export type CreateClientInput = {
  redirectUris: string[];
  allowedScopes: string[];
  ownerAuid: string;
};

export async function createClient(
  input: CreateClientInput,
): Promise<OAuthClient> {
  const db = getDb();
  const rows = await db
    .insert(oauthClients)
    .values({
      auid: input.ownerAuid,
      redirectUris: input.redirectUris,
      allowedScopes: input.allowedScopes,
    })
    .returning();

  return rowToClient(rows[0]!);
}

export type UpdateClientInput = {
  redirectUris: string[];
  allowedScopes: string[];
};

export async function updateClient(
  clientId: string,
  ownerAuid: string,
  input: UpdateClientInput,
): Promise<OAuthClient | undefined> {
  if (clientId !== ownerAuid) {
    return undefined;
  }
  const db = getDb();
  const rows = await db
    .update(oauthClients)
    .set({
      redirectUris: input.redirectUris,
      allowedScopes: input.allowedScopes,
    })
    .where(eq(oauthClients.auid, clientId))
    .returning();

  const row = rows[0];
  if (!row) {
    return undefined;
  }

  return rowToClient(row);
}

export async function deleteClient(
  clientId: string,
  ownerAuid: string,
): Promise<boolean> {
  const db = getDb();
  const existing = await getClientById(clientId);
  if (!existing || existing.auid !== ownerAuid) {
    return false;
  }

  await db.delete(oauthClients).where(eq(oauthClients.auid, clientId));
  return true;
}

export async function getClientForOwner(
  clientId: string,
  ownerAuid: string,
): Promise<OAuthClient | undefined> {
  const client = await getClientById(clientId);
  if (!client || client.auid !== ownerAuid) {
    return undefined;
  }
  return client;
}

export type SaveOauthClientInput = {
  redirectUris: string[];
  allowedScopes: string[];
};

export async function saveOauthClient(
  auid: string,
  input: SaveOauthClientInput,
): Promise<OAuthClient> {
  const db = getDb();
  const rows = await db
    .insert(oauthClients)
    .values({
      auid,
      redirectUris: input.redirectUris,
      allowedScopes: input.allowedScopes,
    })
    .onConflictDoUpdate({
      target: oauthClients.auid,
      set: {
        redirectUris: input.redirectUris,
        allowedScopes: input.allowedScopes,
      },
    })
    .returning();

  return rowToClient(rows[0]!);
}
