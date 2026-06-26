import {
  pgTable,
  text,
  timestamp,
  uuid,
  jsonb,
} from "drizzle-orm/pg-core";

export const oauthClients = pgTable("oauth_clients", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: text("client_id").notNull().unique(),
  name: text("name").notNull(),
  redirectUris: text("redirect_uris").array().notNull(),
  allowedScopes: text("allowed_scopes").array().notNull(),
  ownerAuid: text("owner_auid"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const oauthAuthorizationCodes = pgTable("oauth_authorization_codes", {
  code: text("code").primaryKey(),
  clientId: text("client_id")
    .notNull()
    .references(() => oauthClients.clientId, { onDelete: "cascade" }),
  redirectUri: text("redirect_uri").notNull(),
  scopes: text("scopes").array().notNull(),
  auid: text("auid").notNull(),
  credentials: jsonb("credentials").notNull(),
  codeChallenge: text("code_challenge").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
});

export type OAuthClientRow = typeof oauthClients.$inferSelect;
export type OAuthClientInsert = typeof oauthClients.$inferInsert;
