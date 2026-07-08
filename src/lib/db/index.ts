import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export class DatabaseConfigError extends Error {
  constructor(message = "DATABASE_URL is not configured") {
    super(message);
    this.name = "DatabaseConfigError";
  }
}

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new DatabaseConfigError();
  }
  return url;
}

const globalDb = globalThis as typeof globalThis & {
  __axusPostgres?: ReturnType<typeof postgres>;
  __axusDrizzle?: ReturnType<typeof drizzle<typeof schema>>;
};

export function getDb() {
  if (!globalDb.__axusDrizzle) {
    const client = postgres(getDatabaseUrl(), {
      max: process.env.VERCEL ? 1 : 10,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
    });
    globalDb.__axusPostgres = client;
    globalDb.__axusDrizzle = drizzle(client, { schema });
  }

  return globalDb.__axusDrizzle;
}
