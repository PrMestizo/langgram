-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "public"."Visibility" AS ENUM ('PRIVATE', 'UNLISTED', 'PUBLIC');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- NodeTemplate adjustments
ALTER TABLE "public"."NodeTemplate"
    ADD COLUMN IF NOT EXISTS "visibility" "public"."Visibility" NOT NULL DEFAULT 'PRIVATE',
    ADD COLUMN IF NOT EXISTS "isGlobal" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "showInStore" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "showInSidebar" BOOLEAN NOT NULL DEFAULT false;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'NodeTemplate'
          AND column_name = 'isPublic'
    ) THEN
        UPDATE "public"."NodeTemplate"
        SET
            "visibility" = CASE
                WHEN "isPublic" = true THEN 'PUBLIC'::"public"."Visibility"
                ELSE 'PRIVATE'::"public"."Visibility"
            END,
            "showInStore" = COALESCE("isPublic", false);

        ALTER TABLE "public"."NodeTemplate"
            DROP COLUMN "isPublic";
    END IF;
END $$;

-- EdgeTemplate adjustments
ALTER TABLE "public"."EdgeTemplate"
    ADD COLUMN IF NOT EXISTS "visibility" "public"."Visibility" NOT NULL DEFAULT 'PRIVATE',
    ADD COLUMN IF NOT EXISTS "isGlobal" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "showInStore" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "showInSidebar" BOOLEAN NOT NULL DEFAULT false;

-- Diagram adjustments
ALTER TABLE "public"."Diagram"
    ADD COLUMN IF NOT EXISTS "visibility" "public"."Visibility" NOT NULL DEFAULT 'PRIVATE',
    ADD COLUMN IF NOT EXISTS "isGlobal" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "showInStore" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "showInSidebar" BOOLEAN NOT NULL DEFAULT false;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'Diagram'
          AND column_name = 'isPublic'
    ) THEN
        UPDATE "public"."Diagram"
        SET
            "visibility" = CASE
                WHEN "isPublic" = true THEN 'PUBLIC'::"public"."Visibility"
                ELSE 'PRIVATE'::"public"."Visibility"
            END,
            "showInStore" = COALESCE("isPublic", false);

        ALTER TABLE "public"."Diagram"
            DROP COLUMN "isPublic";
    END IF;
END $$;

-- PromptTemplate adjustments
ALTER TABLE "public"."PromptTemplate"
    ADD COLUMN IF NOT EXISTS "visibility" "public"."Visibility" NOT NULL DEFAULT 'PRIVATE',
    ADD COLUMN IF NOT EXISTS "isGlobal" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "showInStore" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "showInSidebar" BOOLEAN NOT NULL DEFAULT false;

-- ChainTemplate adjustments
ALTER TABLE "public"."ChainTemplate"
    ADD COLUMN IF NOT EXISTS "visibility" "public"."Visibility" NOT NULL DEFAULT 'PRIVATE',
    ADD COLUMN IF NOT EXISTS "isGlobal" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "showInStore" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "showInSidebar" BOOLEAN NOT NULL DEFAULT false;
