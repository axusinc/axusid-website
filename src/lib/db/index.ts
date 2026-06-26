import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not configured");
  }
  return url;
}

const globalDb = globalThis as typeof globalThis & {
  __axusPostgres?: ReturnType<typeof postgres>;
  __axusDrizzle?: ReturnType<typeof drizzle<typeof schema>>;
};

export function getDb() {
  if (!globalDb.__axusDrizzle) {
    const client = postgres(getDatabaseUrl(), { max: 10 });
    globalDb.__axusPostgres = client;
    globalDb.__axusDrizzle = drizzle(client, { schema });
  }

  return globalDb.__axusDrizzle;
}
