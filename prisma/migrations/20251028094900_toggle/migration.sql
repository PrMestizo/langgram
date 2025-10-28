-- AlterTable
ALTER TABLE "public"."ChainTemplate" ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "public"."EdgeTemplate" ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "public"."PromptTemplate" ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT false;
