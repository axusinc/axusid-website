import {
  pgTable,
  text,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";

export const oauthClients = pgTable("oauth_clients", {
  auid: text("auid").primaryKey(),
  redirectUris: text("redirect_uris").array().notNull(),
  allowedScopes: text("allowed_scopes").array().notNull(),
});

export const oauthAuthorizationCodes = pgTable("oauth_authorization_codes", {
  code: text("code").primaryKey(),
  clientAuid: text("client_auid")
    .notNull()
    .references(() => oauthClients.auid, { onDelete: "cascade" }),
  redirectUri: text("redirect_uri").notNull(),
  scopes: text("scopes").array().notNull(),
  userAuid: text("user_auid").notNull(),
  credentials: jsonb("credentials").notNull(),
  codeChallenge: text("code_challenge"),
  nonce: text("nonce"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
});

export type OAuthClientRow = typeof oauthClients.$inferSelect;
export type OAuthClientInsert = typeof oauthClients.$inferInsert;

export const samlConfigs = pgTable("saml_configs", {
  ownerAuid: text("owner_auid").primaryKey(),
  name: text("name").notNull(),
  entityId: text("entity_id").notNull().unique(),
  acsUrl: text("acs_url").notNull(),
  sloUrl: text("slo_url"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type SamlConfigRow = typeof samlConfigs.$inferSelect;
export type SamlConfigInsert = typeof samlConfigs.$inferInsert;

