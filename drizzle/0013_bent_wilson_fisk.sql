CREATE TABLE "gravatar_accounts" (
	"auid" text PRIMARY KEY NOT NULL,
	"md5" text NOT NULL,
	"sha256" text NOT NULL,
	CONSTRAINT "gravatar_accounts_md5_unique" UNIQUE("md5"),
	CONSTRAINT "gravatar_accounts_sha256_unique" UNIQUE("sha256")
);
--> statement-breakpoint
-- Seed identities already seen by this IdP, including accounts whose sessions
-- or grants have ended. New sign-ins and OIDC claims keep this lookup current.
INSERT INTO "gravatar_accounts" ("auid", "md5", "sha256")
SELECT "auid", md5(lower(trim("auid" || '@amail.com'))),
       encode(sha256(convert_to(lower(trim("auid" || '@amail.com')), 'UTF8')), 'hex')
FROM (
  SELECT "user_auid" AS "auid" FROM "login_tokens"
  UNION SELECT "user_auid" FROM "oauth_grants"
  UNION SELECT "user_auid" FROM "oauth_authorization_codes"
  UNION SELECT "user_auid" FROM "oauth_audit_log"
  UNION SELECT "auid" FROM "oauth_clients"
  UNION SELECT "owner_auid" FROM "saml_configs"
) AS known_accounts
WHERE "auid" IS NOT NULL
ON CONFLICT DO NOTHING;
