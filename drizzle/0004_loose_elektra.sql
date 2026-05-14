CREATE TYPE "public"."mcp_layer" AS ENUM('industry', 'public');--> statement-breakpoint
CREATE TABLE "mcp_domains" (
	"key" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"label_zh" text NOT NULL,
	"short" text NOT NULL,
	"sort_order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mcp_landscape_tools" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"name_zh" text,
	"layer" "mcp_layer" NOT NULL,
	"owner_sector" text,
	"owner_domain" text,
	"owner_pdt" text,
	"extension_id" text,
	"in_dev" boolean DEFAULT false NOT NULL,
	"deps_count" integer DEFAULT 0 NOT NULL,
	"blurb" text NOT NULL,
	"blurb_zh" text NOT NULL,
	"tags" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mcp_landscape_tools_slug_unique" UNIQUE("slug"),
	CONSTRAINT "mcp_tools_status_xor" CHECK (NOT ("extension_id" IS NOT NULL AND "in_dev" = true)),
	CONSTRAINT "mcp_tools_owner_layer" CHECK ((layer = 'industry' AND owner_sector IS NOT NULL AND owner_domain IS NULL AND owner_pdt IS NULL)
        OR (layer = 'public' AND owner_sector IS NULL AND owner_domain IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "mcp_pdts" (
	"key" text PRIMARY KEY NOT NULL,
	"domain_key" text NOT NULL,
	"label" text NOT NULL,
	"label_zh" text NOT NULL,
	"sort_order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mcp_sectors" (
	"key" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"label_zh" text NOT NULL,
	"short" text NOT NULL,
	"sort_order" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mcp_landscape_tools" ADD CONSTRAINT "mcp_landscape_tools_owner_sector_mcp_sectors_key_fk" FOREIGN KEY ("owner_sector") REFERENCES "public"."mcp_sectors"("key") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_landscape_tools" ADD CONSTRAINT "mcp_landscape_tools_owner_domain_mcp_domains_key_fk" FOREIGN KEY ("owner_domain") REFERENCES "public"."mcp_domains"("key") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_landscape_tools" ADD CONSTRAINT "mcp_landscape_tools_owner_pdt_mcp_pdts_key_fk" FOREIGN KEY ("owner_pdt") REFERENCES "public"."mcp_pdts"("key") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_landscape_tools" ADD CONSTRAINT "mcp_landscape_tools_extension_id_extensions_id_fk" FOREIGN KEY ("extension_id") REFERENCES "public"."extensions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_pdts" ADD CONSTRAINT "mcp_pdts_domain_key_mcp_domains_key_fk" FOREIGN KEY ("domain_key") REFERENCES "public"."mcp_domains"("key") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_mcp_tools_layer_sector" ON "mcp_landscape_tools" USING btree ("layer","owner_sector");--> statement-breakpoint
CREATE INDEX "idx_mcp_tools_layer_domain_pdt" ON "mcp_landscape_tools" USING btree ("layer","owner_domain","owner_pdt");--> statement-breakpoint
CREATE INDEX "idx_mcp_tools_extension" ON "mcp_landscape_tools" USING btree ("extension_id");--> statement-breakpoint
CREATE INDEX "idx_mcp_pdts_domain_sort" ON "mcp_pdts" USING btree ("domain_key","sort_order");