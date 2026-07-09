import "server-only";

import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { samlConfigs, type SamlConfigRow } from "@/lib/db/schema";

export type SamlConfig = {
  ownerAuid: string;
  name: string;
  entityId: string;
  acsUrl: string;
  sloUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

function rowToConfig(row: SamlConfigRow): SamlConfig {
  return {
    ownerAuid: row.ownerAuid,
    name: row.name,
    entityId: row.entityId,
    acsUrl: row.acsUrl,
    sloUrl: row.sloUrl,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getSamlConfigByAuid(
  auid: string,
): Promise<SamlConfig | undefined> {
  const db = getDb();
  const rows = await db
    .select()
    .from(samlConfigs)
    .where(eq(samlConfigs.ownerAuid, auid))
    .limit(1);

  return rows[0] ? rowToConfig(rows[0]) : undefined;
}

export type UpsertSamlConfigInput = {
  name: string;
  entityId: string;
  acsUrl: string;
  sloUrl?: string;
};

export async function upsertSamlConfig(
  auid: string,
  input: UpsertSamlConfigInput,
): Promise<SamlConfig> {
  const db = getDb();
  
  // Clean inputs
  const name = input.name.trim();
  const entityId = input.entityId.trim();
  const acsUrl = input.acsUrl.trim();
  const sloUrl = input.sloUrl?.trim();

  if (!name || !entityId || !acsUrl) {
    throw new Error("All fields (name, entityId, acsUrl) are required.");
  }

  // Basic URL validation
  try {
    new URL(acsUrl);
  } catch {
    throw new Error("Assertion Consumer Service (ACS) URL must be a valid URL.");
  }

  if (sloUrl) {
    try {
      new URL(sloUrl);
    } catch {
      throw new Error("Single Logout (SLO) URL must be a valid URL.");
    }
  }

  const rows = await db
    .insert(samlConfigs)
    .values({
      ownerAuid: auid,
      name,
      entityId,
      acsUrl,
      sloUrl: sloUrl || null,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: samlConfigs.ownerAuid,
      set: {
        name,
        entityId,
        acsUrl,
        sloUrl: sloUrl || null,
        updatedAt: new Date(),
      },
    })
    .returning();

  return rowToConfig(rows[0]!);
}

export async function deleteSamlConfig(auid: string): Promise<boolean> {
  const db = getDb();
  const existing = await getSamlConfigByAuid(auid);
  if (!existing) {
    return false;
  }

  await db.delete(samlConfigs).where(eq(samlConfigs.ownerAuid, auid));
  return true;
}
