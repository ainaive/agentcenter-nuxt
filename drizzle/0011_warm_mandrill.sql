ALTER TABLE "extensions" ADD COLUMN "revoked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "extensions" ADD COLUMN "revoked_by_user_id" text;--> statement-breakpoint
ALTER TABLE "extensions" ADD COLUMN "revocation_note" text;--> statement-breakpoint
ALTER TABLE "extensions" ADD CONSTRAINT "extensions_revoked_by_user_id_users_id_fk" FOREIGN KEY ("revoked_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;