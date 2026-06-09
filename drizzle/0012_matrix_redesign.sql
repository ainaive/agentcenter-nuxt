CREATE TYPE "public"."admin_category_level" AS ENUM('all', 'macro', 'micro');--> statement-breakpoint
-- Clean replacement: the pre-redesign matrix tables held seed data only
-- (the product is pre-launch — see CLAUDE.md). Both tables are dropped
-- and recreated under the new shape rather than backfilled in place,
-- because the new keys (`extension_category`, `category_level`,
-- `category_key`, `l2`) have no defensible default for legacy rows.
DROP TABLE "approval_reviewers" CASCADE;--> statement-breakpoint
DROP TABLE "approval_requests" CASCADE;--> statement-breakpoint
CREATE TABLE "approval_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"extension_id" text NOT NULL,
	"extension_category" "extension_category" NOT NULL,
	"requested_tier" "extension_official_tier" NOT NULL,
	"sub_cat" text NOT NULL,
	"l2" text,
	"product_line_id" text,
	"requested_by_user_id" text NOT NULL,
	"reason" text,
	"status" "approval_status" DEFAULT 'pending' NOT NULL,
	"decided_by_user_id" text,
	"decided_at" timestamp with time zone,
	"reviewer_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "approval_requests_pl_shape_chk" CHECK ((requested_tier = 'productLine' AND product_line_id IS NOT NULL)
        OR (requested_tier = 'company' AND product_line_id IS NULL))
);
--> statement-breakpoint
CREATE TABLE "approval_admins" (
	"id" text PRIMARY KEY NOT NULL,
	"extension_category" "extension_category" NOT NULL,
	"tier" "extension_official_tier" NOT NULL,
	"product_line_id" text,
	"category_level" "admin_category_level" NOT NULL,
	"category_key" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "approval_admins_pl_shape_chk" CHECK ((tier = 'productLine' AND product_line_id IS NOT NULL)
        OR (tier = 'company' AND product_line_id IS NULL)),
	CONSTRAINT "approval_admins_level_shape_chk" CHECK ((category_level = 'all' AND category_key = '*')
        OR (category_level <> 'all' AND category_key <> '*'))
);
--> statement-breakpoint
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_extension_id_extensions_id_fk" FOREIGN KEY ("extension_id") REFERENCES "public"."extensions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_product_line_id_product_lines_id_fk" FOREIGN KEY ("product_line_id") REFERENCES "public"."product_lines"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_decided_by_user_id_users_id_fk" FOREIGN KEY ("decided_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_admins" ADD CONSTRAINT "approval_admins_product_line_id_product_lines_id_fk" FOREIGN KEY ("product_line_id") REFERENCES "public"."product_lines"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_admins" ADD CONSTRAINT "approval_admins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_approval_status_cell" ON "approval_requests" USING btree ("status","extension_category","sub_cat","requested_tier","product_line_id","l2");--> statement-breakpoint
CREATE INDEX "idx_approval_ext_status" ON "approval_requests" USING btree ("extension_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "approval_requests_one_pending_uq" ON "approval_requests" USING btree ("extension_id") WHERE status = 'pending';--> statement-breakpoint
CREATE UNIQUE INDEX "approval_admins_pl_uq" ON "approval_admins" USING btree ("extension_category","tier","product_line_id","category_level","category_key","user_id") WHERE tier = 'productLine';--> statement-breakpoint
CREATE UNIQUE INDEX "approval_admins_co_uq" ON "approval_admins" USING btree ("extension_category","tier","category_level","category_key","user_id") WHERE tier = 'company';--> statement-breakpoint
CREATE INDEX "idx_admins_cell" ON "approval_admins" USING btree ("extension_category","tier","product_line_id","category_level","category_key");--> statement-breakpoint
CREATE INDEX "idx_admins_user" ON "approval_admins" USING btree ("user_id");
