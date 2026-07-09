ALTER TABLE "oauth_clients" RENAME COLUMN "client_id" TO "auid";--> statement-breakpoint
ALTER TABLE "oauth_clients" DROP COLUMN "name";--> statement-breakpoint
ALTER TABLE "oauth_clients" DROP COLUMN "created_at";--> statement-breakpoint
ALTER TABLE "oauth_clients" DROP COLUMN "updated_at";--> statement-breakpoint
ALTER TABLE "oauth_authorization_codes" RENAME COLUMN "client_id" TO "client_auid";--> statement-breakpoint
ALTER TABLE "oauth_authorization_codes" RENAME COLUMN "auid" TO "user_auid";
