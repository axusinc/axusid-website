import postgres from "postgres";

const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://axusid:axusid@localhost:5432/axusid";

const DEV_CLIENT = {
  auid: "axusid-dev",
  redirect_uris: [
    "http://localhost:3000/callback",
    "http://localhost:3001/callback",
    "http://127.0.0.1:3000/callback",
  ],
  allowed_scopes: ["openid", "profile", "email", "offline_access"],
};

async function main() {
  const sql = postgres(DATABASE_URL, { max: 1 });

  try {
    const existing = await sql`
      SELECT auid FROM oauth_clients WHERE auid = ${DEV_CLIENT.auid}
    `;

    if (existing.length > 0) {
      console.log("Seed client axusid-dev already exists.");
      return;
    }

    await sql`
      INSERT INTO oauth_clients (
        auid,
        redirect_uris,
        allowed_scopes
      ) VALUES (
        ${DEV_CLIENT.auid},
        ${DEV_CLIENT.redirect_uris},
        ${DEV_CLIENT.allowed_scopes}
      )
    `;

    console.log("Seeded axusid-dev OAuth client.");
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
