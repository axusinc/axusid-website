import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const oauthClients = pgTable("oauth_clients", {
  auid: text("auid").primaryKey(),
  redirectUris: text("redirect_uris").array().notNull(),
  allowedScopes: text("allowed_scopes").array().notNull(),
  /**
   * "opaque" (the default) hands out a random string this server can revoke and that apps
   * check through introspection; "jwt" is for clients that need a self-contained,
   * short-lived token they can verify offline.
   */
  accessTokenFormat: text("access_token_format").notNull().default("opaque"),
});

export const oauthAuthorizationCodes = pgTable("oauth_authorization_codes", {
  code: text("code").primaryKey(),
  clientAuid: text("client_auid")
    .notNull()
    .references(() => oauthClients.auid, { onDelete: "cascade" }),
  redirectUri: text("redirect_uri").notNull(),
  scopes: text("scopes").array().notNull(),
  userAuid: text("user_auid").notNull(),
  /** The authorization this code hands over; the app's token hangs off it. */
  grantId: text("grant_id").notNull(),
  codeChallenge: text("code_challenge"),
  nonce: text("nonce"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
});

/**
 * A user's standing authorization for one app: what they consented to, and the native token
 * the app acts with. Consent lives here rather than in the session cookie so it survives
 * sign-out, can be listed on the account page, and can be revoked from either side.
 */
export const oauthGrants = pgTable(
  "oauth_grants",
  {
    id: text("id").primaryKey(),
    userAuid: text("user_auid").notNull(),
    clientAuid: text("client_auid")
      .notNull()
      .references(() => oauthClients.auid, { onDelete: "cascade" }),
    scopes: text("scopes").array().notNull(),
    // Encrypted native token id (secret-box).
    tokenId: text("token_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("oauth_grants_active_user_client_idx")
      .on(table.userAuid, table.clientAuid)
      .where(sql`revoked_at IS NULL`),
    index("oauth_grants_user_idx").on(table.userAuid),
  ],
);

/**
 * Refresh tokens are rotated: each use issues a successor and marks its predecessor rotated.
 * A rotated token presented again after the grace window means the token leaked, and the
 * whole grant is revoked. Only the hash is stored, so the database never holds a usable token.
 */
export const oauthRefreshTokens = pgTable(
  "oauth_refresh_tokens",
  {
    id: text("id").primaryKey(),
    grantId: text("grant_id")
      .notNull()
      .references(() => oauthGrants.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    rotatedAt: timestamp("rotated_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [index("oauth_refresh_tokens_grant_idx").on(table.grantId)],
);

/** Opaque access tokens, stored hashed. JWT access tokens are not recorded here. */
export const oauthAccessTokens = pgTable(
  "oauth_access_tokens",
  {
    id: text("id").primaryKey(),
    grantId: text("grant_id")
      .notNull()
      .references(() => oauthGrants.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    scopes: text("scopes").array().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [index("oauth_access_tokens_grant_idx").on(table.grantId)],
);

/** What happened to an authorization, for the user's account page and for investigations. */
export const oauthAuditLog = pgTable(
  "oauth_audit_log",
  {
    id: text("id").primaryKey(),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
    event: text("event").notNull(),
    userAuid: text("user_auid"),
    clientAuid: text("client_auid"),
    grantId: text("grant_id"),
    detail: jsonb("detail"),
  },
  (table) => [index("oauth_audit_log_user_idx").on(table.userAuid, table.at)],
);

export type OAuthGrantRow = typeof oauthGrants.$inferSelect;
export type OAuthRefreshTokenRow = typeof oauthRefreshTokens.$inferSelect;
export type OAuthAccessTokenRow = typeof oauthAccessTokens.$inferSelect;

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

