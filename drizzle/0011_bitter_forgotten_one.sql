CREATE TABLE "login_tokens" (
	"token_id" text PRIMARY KEY NOT NULL,
	"user_auid" text NOT NULL,
	"bearer_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "login_tokens_user_idx" ON "login_tokens" USING btree ("user_auid");