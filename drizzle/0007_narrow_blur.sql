CREATE TABLE "oauth_access_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"grant_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"scopes" text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "oauth_access_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "oauth_audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"event" text NOT NULL,
	"user_auid" text,
	"client_auid" text,
	"grant_id" text,
	"detail" jsonb
);
--> statement-breakpoint
CREATE TABLE "oauth_grants" (
	"id" text PRIMARY KEY NOT NULL,
	"user_auid" text NOT NULL,
	"client_auid" text NOT NULL,
	"scopes" text[] NOT NULL,
	"token_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "oauth_refresh_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"grant_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"rotated_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "oauth_refresh_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "oauth_authorization_codes" ALTER COLUMN "token_id" DROP NOT NULL;--> statement-breakpoint
--> Authorization codes live five minutes and now point at a grant instead of a token, so the
--> pending ones are dropped rather than migrated.
DELETE FROM "oauth_authorization_codes";--> statement-breakpoint
ALTER TABLE "oauth_authorization_codes" ADD COLUMN "grant_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "oauth_clients" ADD COLUMN "access_token_format" text DEFAULT 'opaque' NOT NULL;--> statement-breakpoint
ALTER TABLE "oauth_access_tokens" ADD CONSTRAINT "oauth_access_tokens_grant_id_oauth_grants_id_fk" FOREIGN KEY ("grant_id") REFERENCES "public"."oauth_grants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_grants" ADD CONSTRAINT "oauth_grants_client_auid_oauth_clients_auid_fk" FOREIGN KEY ("client_auid") REFERENCES "public"."oauth_clients"("auid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_refresh_tokens" ADD CONSTRAINT "oauth_refresh_tokens_grant_id_oauth_grants_id_fk" FOREIGN KEY ("grant_id") REFERENCES "public"."oauth_grants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "oauth_access_tokens_grant_idx" ON "oauth_access_tokens" USING btree ("grant_id");--> statement-breakpoint
CREATE INDEX "oauth_audit_log_user_idx" ON "oauth_audit_log" USING btree ("user_auid","at");--> statement-breakpoint
CREATE UNIQUE INDEX "oauth_grants_active_user_client_idx" ON "oauth_grants" USING btree ("user_auid","client_auid") WHERE revoked_at IS NULL;--> statement-breakpoint
CREATE INDEX "oauth_grants_user_idx" ON "oauth_grants" USING btree ("user_auid");--> statement-breakpoint
CREATE INDEX "oauth_refresh_tokens_grant_idx" ON "oauth_refresh_tokens" USING btree ("grant_id");