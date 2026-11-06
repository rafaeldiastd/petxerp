ALTER TABLE "adoptions" ADD COLUMN "group_id" uuid;--> statement-breakpoint
CREATE INDEX "adoptions_group_id_index" ON "adoptions" USING btree ("group_id");