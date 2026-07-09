ALTER TABLE "oauth_clients" DROP CONSTRAINT "oauth_clients_client_id_unique";--> statement-breakpoint
ALTER TABLE "oauth_clients" ADD PRIMARY KEY ("client_id");--> statement-breakpoint
ALTER TABLE "oauth_clients" DROP COLUMN "id";--> statement-breakpoint
ALTER TABLE "oauth_clients" DROP COLUMN "owner_auid";