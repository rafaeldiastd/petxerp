CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "adoptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"animal_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"date" date NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"location" text,
	"castration_deadline" date,
	"castration_done" boolean DEFAULT false NOT NULL,
	"castration_done_at" date,
	"requirements" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"documents" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"animal_snapshot" jsonb,
	"term_snapshot" jsonb,
	"term_accepted_at" timestamp with time zone,
	"notes" text,
	"returned_at" date,
	"return_reason" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "animal_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"animal_id" uuid NOT NULL,
	"type" text NOT NULL,
	"date" date NOT NULL,
	"title" text,
	"description" text,
	"next_date" date,
	"cost" numeric(12, 2),
	"data" jsonb,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "animals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"code" integer NOT NULL,
	"name" text NOT NULL,
	"species" text NOT NULL,
	"sex" text DEFAULT 'unknown' NOT NULL,
	"age_group" text,
	"birth_date" date,
	"breed" text,
	"size" text,
	"coat_color" text,
	"weight_kg" numeric(6, 2),
	"microchip" text,
	"photo_key" text,
	"status" text DEFAULT 'sheltered' NOT NULL,
	"temperament" text[] DEFAULT '{}'::text[] NOT NULL,
	"behavior" text,
	"diseases" text,
	"disabilities" text,
	"special_care" text,
	"castrated" boolean DEFAULT false NOT NULL,
	"castration_date" date,
	"vaccinated" boolean DEFAULT false NOT NULL,
	"dewormed" boolean DEFAULT false NOT NULL,
	"bonded_with" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	"intake_date" date DEFAULT now() NOT NULL,
	"intake_source" text,
	"occurrence_number" text,
	"intake_street" text,
	"intake_neighborhood" text,
	"intake_city" text,
	"intake_state" text,
	"reporter_id" uuid,
	"intake_reasons" text[] DEFAULT '{}'::text[] NOT NULL,
	"intake_reason_other" text,
	"intake_condition" text,
	"intake_procedures" text[] DEFAULT '{}'::text[] NOT NULL,
	"intake_procedures_other" text,
	"intake_destination" text,
	"mother_with_pups" boolean DEFAULT false NOT NULL,
	"litter_males" integer,
	"litter_females" integer,
	"death_date" date,
	"death_reason" text,
	"death_notes" text,
	"adopted_at" date,
	"adopter_id" uuid,
	"notes" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "donations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"person_id" uuid,
	"donor_name" text,
	"donor_email" text,
	"amount" numeric(12, 2) NOT NULL,
	"method" text NOT NULL,
	"status" text DEFAULT 'paid' NOT NULL,
	"provider" text,
	"provider_ref" text,
	"date" timestamp with time zone DEFAULT now() NOT NULL,
	"notes" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"description" text NOT NULL,
	"category" text DEFAULT 'other' NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"partner_id" uuid,
	"animal_id" uuid,
	"due_date" date,
	"payment_method" text,
	"paid" boolean DEFAULT false NOT NULL,
	"paid_at" date,
	"attachment_key" text,
	"notes" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'voluntario' NOT NULL,
	"permissions" text[],
	"job_title" text,
	"phone" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"legal_name" text,
	"document" text,
	"email" text,
	"phone" text,
	"whatsapp" text,
	"instagram" text,
	"website" text,
	"zip" text,
	"street" text,
	"number" text,
	"complement" text,
	"neighborhood" text,
	"city" text,
	"state" text,
	"logo_key" text,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "partners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" text DEFAULT 'clinic' NOT NULL,
	"document" text,
	"contact_name" text,
	"phone" text,
	"email" text,
	"address" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "payment_settings" (
	"org_id" uuid PRIMARY KEY NOT NULL,
	"pix_enabled" boolean DEFAULT false NOT NULL,
	"pix_key" text,
	"pix_key_type" text,
	"pix_name" text,
	"pix_city" text,
	"stripe_enabled" boolean DEFAULT false NOT NULL,
	"stripe_publishable_key" text,
	"stripe_secret_key_enc" text,
	"stripe_webhook_secret_enc" text,
	"mp_enabled" boolean DEFAULT false NOT NULL,
	"mp_public_key" text,
	"mp_access_token_enc" text,
	"mp_webhook_secret_enc" text,
	"suggested_amounts" integer[] DEFAULT '{20,50,100,200}'::integer[] NOT NULL,
	"donation_message" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "people" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"types" text[] DEFAULT '{}'::text[] NOT NULL,
	"cpf" text,
	"rg" text,
	"birth_date" date,
	"email" text,
	"phone" text,
	"whatsapp" text,
	"zip" text,
	"street" text,
	"number" text,
	"complement" text,
	"neighborhood" text,
	"city" text,
	"state" text,
	"housing_type" text,
	"housing_notes" text,
	"restricted" boolean DEFAULT false NOT NULL,
	"restriction_reason" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "stock_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"kind" text DEFAULT 'other' NOT NULL,
	"species" text,
	"age_group" text,
	"unit" text DEFAULT 'un' NOT NULL,
	"quantity" numeric(12, 3) DEFAULT 0 NOT NULL,
	"min_quantity" numeric(12, 3),
	"brand" text,
	"expires_at" date,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"type" text NOT NULL,
	"quantity" numeric(12, 3) NOT NULL,
	"balance_after" numeric(12, 3) NOT NULL,
	"reason" text,
	"date" date NOT NULL,
	"notes" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adoptions" ADD CONSTRAINT "adoptions_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adoptions" ADD CONSTRAINT "adoptions_animal_id_animals_id_fk" FOREIGN KEY ("animal_id") REFERENCES "public"."animals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adoptions" ADD CONSTRAINT "adoptions_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adoptions" ADD CONSTRAINT "adoptions_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "animal_events" ADD CONSTRAINT "animal_events_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "animal_events" ADD CONSTRAINT "animal_events_animal_id_animals_id_fk" FOREIGN KEY ("animal_id") REFERENCES "public"."animals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "animal_events" ADD CONSTRAINT "animal_events_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "animals" ADD CONSTRAINT "animals_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "animals" ADD CONSTRAINT "animals_reporter_id_people_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."people"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "animals" ADD CONSTRAINT "animals_adopter_id_people_id_fk" FOREIGN KEY ("adopter_id") REFERENCES "public"."people"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "animals" ADD CONSTRAINT "animals_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donations" ADD CONSTRAINT "donations_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donations" ADD CONSTRAINT "donations_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donations" ADD CONSTRAINT "donations_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_animal_id_animals_id_fk" FOREIGN KEY ("animal_id") REFERENCES "public"."animals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partners" ADD CONSTRAINT "partners_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_settings" ADD CONSTRAINT "payment_settings_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "people" ADD CONSTRAINT "people_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_items" ADD CONSTRAINT "stock_items_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_item_id_stock_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."stock_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_id_index" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "adoptions_org_id_date_index" ON "adoptions" USING btree ("org_id","date");--> statement-breakpoint
CREATE INDEX "adoptions_animal_id_index" ON "adoptions" USING btree ("animal_id");--> statement-breakpoint
CREATE INDEX "adoptions_person_id_index" ON "adoptions" USING btree ("person_id");--> statement-breakpoint
CREATE INDEX "animal_events_animal_id_date_index" ON "animal_events" USING btree ("animal_id","date");--> statement-breakpoint
CREATE INDEX "animal_events_org_id_next_date_index" ON "animal_events" USING btree ("org_id","next_date");--> statement-breakpoint
CREATE INDEX "animal_events_org_id_created_at_index" ON "animal_events" USING btree ("org_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "animals_org_id_code_index" ON "animals" USING btree ("org_id","code");--> statement-breakpoint
CREATE INDEX "animals_org_id_status_index" ON "animals" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "animals_org_id_intake_date_index" ON "animals" USING btree ("org_id","intake_date");--> statement-breakpoint
CREATE INDEX "donations_org_id_date_index" ON "donations" USING btree ("org_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "donations_provider_provider_ref_index" ON "donations" USING btree ("provider","provider_ref");--> statement-breakpoint
CREATE INDEX "expenses_org_id_paid_due_date_index" ON "expenses" USING btree ("org_id","paid","due_date");--> statement-breakpoint
CREATE INDEX "expenses_animal_id_index" ON "expenses" USING btree ("animal_id");--> statement-breakpoint
CREATE INDEX "expenses_partner_id_index" ON "expenses" USING btree ("partner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "memberships_org_id_user_id_index" ON "memberships" USING btree ("org_id","user_id");--> statement-breakpoint
CREATE INDEX "memberships_user_id_index" ON "memberships" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "partners_org_id_index" ON "partners" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "people_org_id_name_index" ON "people" USING btree ("org_id","name");--> statement-breakpoint
CREATE INDEX "people_org_id_cpf_index" ON "people" USING btree ("org_id","cpf");--> statement-breakpoint
CREATE INDEX "session_user_id_index" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "stock_items_org_id_kind_index" ON "stock_items" USING btree ("org_id","kind");--> statement-breakpoint
CREATE INDEX "stock_movements_org_id_date_index" ON "stock_movements" USING btree ("org_id","date");--> statement-breakpoint
CREATE INDEX "stock_movements_item_id_index" ON "stock_movements" USING btree ("item_id");