CREATE TYPE "public"."extension_official_tier" AS ENUM('productLine', 'company');--> statement-breakpoint
CREATE TYPE "public"."approval_status" AS ENUM('pending', 'approved', 'rejected', 'withdrawn');--> statement-breakpoint
ALTER TYPE "public"."membership_role" ADD VALUE 'superAdmin';--> statement-breakpoint
CREATE TABLE "approval_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"extension_id" text NOT NULL,
	"requested_tier" "extension_official_tier" NOT NULL,
	"sub_cat" text NOT NULL,
	"requested_by_user_id" text NOT NULL,
	"reason" text,
	"status" "approval_status" DEFAULT 'pending' NOT NULL,
	"decided_by_user_id" text,
	"decided_at" timestamp with time zone,
	"reviewer_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approval_reviewers" (
	"id" text PRIMARY KEY NOT NULL,
	"tier" "extension_official_tier" NOT NULL,
	"sub_cat" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "approval_reviewers_cell_user_unique" UNIQUE("tier","sub_cat","user_id")
);
--> statement-breakpoint
ALTER TABLE "extensions" ADD COLUMN "official_tier" "extension_official_tier";--> statement-breakpoint
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_extension_id_extensions_id_fk" FOREIGN KEY ("extension_id") REFERENCES "public"."extensions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_decided_by_user_id_users_id_fk" FOREIGN KEY ("decided_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_reviewers" ADD CONSTRAINT "approval_reviewers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_approval_status_cell" ON "approval_requests" USING btree ("status","sub_cat","requested_tier");--> statement-breakpoint
CREATE INDEX "idx_approval_ext_status" ON "approval_requests" USING btree ("extension_id","status");--> statement-breakpoint
CREATE INDEX "idx_approval_reviewers_cell" ON "approval_reviewers" USING btree ("tier","sub_cat");--> statement-breakpoint
CREATE INDEX "idx_ext_official_tier" ON "extensions" USING btree ("official_tier");