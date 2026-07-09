CREATE TABLE "saml_configs" (
	"owner_auid" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"entity_id" text NOT NULL,
	"acs_url" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "saml_configs_entity_id_unique" UNIQUE("entity_id")
);
