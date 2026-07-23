ALTER TABLE "oauth_authorization_codes" DROP CONSTRAINT "oauth_authorization_codes_client_id_oauth_clients_client_id_fk";--> statement-breakpoint
ALTER TABLE "oauth_clients" DROP CONSTRAINT "oauth_clients_client_id_unique";--> statement-breakpoint
ALTER TABLE "oauth_clients" DROP COLUMN "id";--> statement-breakpoint
ALTER TABLE "oauth_clients" ADD PRIMARY KEY ("client_id");--> statement-breakpoint
ALTER TABLE "oauth_clients" DROP COLUMN "owner_auid";--> statement-breakpoint
ALTER TABLE "oauth_authorization_codes" ADD CONSTRAINT "oauth_authorization_codes_client_id_oauth_clients_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."oauth_clients"("client_id") ON DELETE cascade ON UPDATE no action;