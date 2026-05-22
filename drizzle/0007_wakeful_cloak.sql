CREATE TYPE "public"."collection_visibility" AS ENUM('private', 'public');--> statement-breakpoint
ALTER TABLE "collections" ADD COLUMN "slug" text;--> statement-breakpoint
ALTER TABLE "collections" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "collections" ADD COLUMN "description_zh" text;--> statement-breakpoint
ALTER TABLE "collections" ADD COLUMN "visibility" "collection_visibility" DEFAULT 'private' NOT NULL;--> statement-breakpoint
ALTER TABLE "collections" ADD COLUMN "published_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "collections" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
-- Backfill shortcodes for any pre-existing collections (system 'Installed' /
-- 'Saved' rows on already-onboarded users). 10 base36 chars from md5(id || rand)
-- collides with ~36^10 probability — effectively zero for the row counts here.
UPDATE "collections" SET "slug" = lower(substring(md5("id" || random()::text) for 10)) WHERE "slug" IS NULL;--> statement-breakpoint
ALTER TABLE "collections" ALTER COLUMN "slug" SET NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_collections_owner_user" ON "collections" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "idx_collections_visibility_published" ON "collections" USING btree ("visibility","published_at" DESC);--> statement-breakpoint
ALTER TABLE "collections" ADD CONSTRAINT "collections_slug_unique" UNIQUE("slug");
