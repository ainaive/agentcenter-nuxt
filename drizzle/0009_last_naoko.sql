CREATE TABLE "product_lines" (
	"id" text PRIMARY KEY NOT NULL,
	"label_en" text NOT NULL,
	"label_zh" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
INSERT INTO "product_lines" ("id", "label_en", "label_zh", "sort_order") VALUES
	('wireless',  'Wireless',  '无线', 10),
	('datacom',   'Datacom',   '数通', 20),
	('terminals', 'Terminals', '终端', 30),
	('cloud',     'Cloud',     '云',   40);
--> statement-breakpoint
ALTER TABLE "approval_reviewers" DROP CONSTRAINT "approval_reviewers_cell_user_unique";--> statement-breakpoint
DROP INDEX "idx_approval_status_cell";--> statement-breakpoint
DROP INDEX "idx_approval_reviewers_cell";--> statement-breakpoint
ALTER TABLE "extensions" ADD COLUMN "product_line_id" text;--> statement-breakpoint
ALTER TABLE "approval_requests" ADD COLUMN "product_line_id" text;--> statement-breakpoint
ALTER TABLE "approval_reviewers" ADD COLUMN "product_line_id" text;--> statement-breakpoint
ALTER TABLE "extensions" ADD CONSTRAINT "extensions_product_line_id_product_lines_id_fk" FOREIGN KEY ("product_line_id") REFERENCES "public"."product_lines"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_product_line_id_product_lines_id_fk" FOREIGN KEY ("product_line_id") REFERENCES "public"."product_lines"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_reviewers" ADD CONSTRAINT "approval_reviewers_product_line_id_product_lines_id_fk" FOREIGN KEY ("product_line_id") REFERENCES "public"."product_lines"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
-- Backfill existing rows before the CHECK constraints land. Pre-0009 rows
-- carry no product line, so productLine-tier rows must either be expanded
-- per line (reviewers) or defaulted (requests + extensions). `wireless`
-- is the default for legacy single-PL-tier rows since it sorts first.
UPDATE "extensions"
   SET "product_line_id" = 'wireless'
 WHERE "official_tier" = 'productLine' AND "product_line_id" IS NULL;
--> statement-breakpoint
UPDATE "approval_requests"
   SET "product_line_id" = 'wireless'
 WHERE "requested_tier" = 'productLine' AND "product_line_id" IS NULL;
--> statement-breakpoint
-- Expand each pre-existing productLine reviewer into one row per product line
-- so coverage is preserved without picking favourites. The new partial unique
-- index allows (tier, sub_cat, product_line_id, user_id) per cell.
INSERT INTO "approval_reviewers" ("id", "tier", "sub_cat", "product_line_id", "user_id", "created_at")
SELECT r."id" || '-' || pl."id", r."tier", r."sub_cat", pl."id", r."user_id", r."created_at"
  FROM "approval_reviewers" r
 CROSS JOIN "product_lines" pl
 WHERE r."tier" = 'productLine' AND r."product_line_id" IS NULL;
--> statement-breakpoint
DELETE FROM "approval_reviewers"
 WHERE "tier" = 'productLine' AND "product_line_id" IS NULL;
--> statement-breakpoint
CREATE INDEX "idx_ext_product_line" ON "extensions" USING btree ("product_line_id");--> statement-breakpoint
CREATE UNIQUE INDEX "approval_reviewers_pl_cell_user_uq" ON "approval_reviewers" USING btree ("tier","sub_cat","product_line_id","user_id") WHERE tier = 'productLine';--> statement-breakpoint
CREATE UNIQUE INDEX "approval_reviewers_co_cell_user_uq" ON "approval_reviewers" USING btree ("tier","sub_cat","user_id") WHERE tier = 'company';--> statement-breakpoint
CREATE INDEX "idx_approval_status_cell" ON "approval_requests" USING btree ("status","sub_cat","requested_tier","product_line_id");--> statement-breakpoint
CREATE INDEX "idx_approval_reviewers_cell" ON "approval_reviewers" USING btree ("tier","sub_cat","product_line_id");--> statement-breakpoint
ALTER TABLE "extensions" ADD CONSTRAINT "extensions_pl_shape_chk" CHECK (official_tier IS NULL
        OR (official_tier = 'productLine' AND product_line_id IS NOT NULL)
        OR (official_tier = 'company' AND product_line_id IS NULL));--> statement-breakpoint
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_pl_shape_chk" CHECK ((requested_tier = 'productLine' AND product_line_id IS NOT NULL)
        OR (requested_tier = 'company' AND product_line_id IS NULL));--> statement-breakpoint
ALTER TABLE "approval_reviewers" ADD CONSTRAINT "approval_reviewers_pl_shape_chk" CHECK ((tier = 'productLine' AND product_line_id IS NOT NULL)
        OR (tier = 'company' AND product_line_id IS NULL));
