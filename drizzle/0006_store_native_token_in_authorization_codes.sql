-- Authorization codes now carry an encrypted native token instead of engine access/refresh
-- credentials, which the engine no longer issues. Codes live five minutes, so pending ones are
-- dropped rather than converted.
DELETE FROM "oauth_authorization_codes";--> statement-breakpoint
ALTER TABLE "oauth_authorization_codes" DROP COLUMN "credentials";--> statement-breakpoint
ALTER TABLE "oauth_authorization_codes" ADD COLUMN "token_id" text NOT NULL;
