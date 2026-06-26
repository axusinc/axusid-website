import "server-only";

import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { oauthClients, type OAuthClientRow } from "@/lib/db/schema";
import type { OAuthClient } from "@/lib/oauth/constants";

function rowToClient(row: OAuthClientRow): OAuthClient {
  return {
    clientId: row.clientId,
    name: row.name,
    redirectUris: row.redirectUris,
    allowedScopes: row.allowedScopes,
    ownerAuid: row.ownerAuid,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getClientById(
  clientId: string,
): Promise<OAuthClient | undefined> {
  const db = getDb();
  const rows = await db
    .select()
    .from(oauthClients)
    .where(eq(oauthClients.clientId, clientId))
    .limit(1);

  return rows[0] ? rowToClient(rows[0]) : undefined;
}

export async function listClientsByOwner(auid: string): Promise<OAuthClient[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(oauthClients)
    .where(eq(oauthClients.ownerAuid, auid));

  return rows.map(rowToClient);
}

export type CreateClientInput = {
  name: string;
  redirectUris: string[];
  allowedScopes: string[];
  ownerAuid: string;
};

export async function createClient(
  input: CreateClientInput,
): Promise<OAuthClient> {
  const db = getDb();
  const clientId = crypto.randomUUID();
  const rows = await db
    .insert(oauthClients)
    .values({
      clientId,
      name: input.name,
      redirectUris: input.redirectUris,
      allowedScopes: input.allowedScopes,
      ownerAuid: input.ownerAuid,
    })
    .returning();

  return rowToClient(rows[0]!);
}

export type UpdateClientInput = {
  name: string;
  redirectUris: string[];
  allowedScopes: string[];
};

export async function updateClient(
  clientId: string,
  ownerAuid: string,
  input: UpdateClientInput,
): Promise<OAuthClient | undefined> {
  const db = getDb();
  const rows = await db
    .update(oauthClients)
    .set({
      name: input.name,
      redirectUris: input.redirectUris,
      allowedScopes: input.allowedScopes,
      updatedAt: new Date(),
    })
    .where(eq(oauthClients.clientId, clientId))
    .returning();

  const row = rows[0];
  if (!row || row.ownerAuid !== ownerAuid) {
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
  if (!existing || existing.ownerAuid !== ownerAuid) {
    return false;
  }

  await db.delete(oauthClients).where(eq(oauthClients.clientId, clientId));
  return true;
}

export async function getClientForOwner(
  clientId: string,
  ownerAuid: string,
): Promise<OAuthClient | undefined> {
  const client = await getClientById(clientId);
  if (!client || client.ownerAuid !== ownerAuid) {
    return undefined;
  }
  return client;
}
