ALTER TABLE "oauth_authorization_codes" ALTER COLUMN "code_challenge" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "oauth_authorization_codes" ADD COLUMN "nonce" text;
