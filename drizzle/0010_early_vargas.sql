ALTER TABLE "extensions" DROP CONSTRAINT "extensions_product_line_id_product_lines_id_fk";
--> statement-breakpoint
ALTER TABLE "extensions" ADD CONSTRAINT "extensions_product_line_id_product_lines_id_fk" FOREIGN KEY ("product_line_id") REFERENCES "public"."product_lines"("id") ON DELETE restrict ON UPDATE no action;