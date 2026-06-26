import path from "node:path";

import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

let migrationPromise: Promise<void> | undefined;

export async function runMigrations(): Promise<void> {
  if (process.env.DATABASE_AUTO_MIGRATE === "false") {
    return;
  }

  if (migrationPromise) {
    return migrationPromise;
  }

  migrationPromise = (async () => {
    const url = process.env.DATABASE_URL;
    if (!url) {
      console.warn("[db] DATABASE_URL is not set; skipping migrations");
      return;
    }

    const migrationsFolder = path.join(process.cwd(), "drizzle");
    const client = postgres(url, { max: 1 });

    try {
      const db = drizzle(client);
      await migrate(db, { migrationsFolder });
      console.log("[db] Migrations up to date");
    } finally {
      await client.end();
    }
  })();

  return migrationPromise;
}
