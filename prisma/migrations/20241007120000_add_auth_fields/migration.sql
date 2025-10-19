-- AlterTable
ALTER TABLE "public"."User"
  ADD COLUMN IF NOT EXISTS "password" TEXT,
  ADD COLUMN IF NOT EXISTS "role" TEXT NOT NULL DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS "emailVerified" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "image" TEXT;

-- AlterTable
ALTER TABLE "public"."EdgeTemplate"
  ADD COLUMN IF NOT EXISTS "language" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "public"."PromptTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PromptTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "public"."ChainTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "code" TEXT NOT NULL,
    "language" TEXT,
    "metadata" JSONB,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ChainTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "public"."Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "public"."Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "public"."VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Account_provider_providerAccountId_key"
  ON "public"."Account"("provider", "providerAccountId");

CREATE UNIQUE INDEX IF NOT EXISTS "Session_sessionToken_key"
  ON "public"."Session"("sessionToken");

CREATE UNIQUE INDEX IF NOT EXISTS "VerificationToken_token_key"
  ON "public"."VerificationToken"("token");

CREATE UNIQUE INDEX IF NOT EXISTS "VerificationToken_identifier_token_key"
  ON "public"."VerificationToken"("identifier", "token");

-- AddForeignKey
ALTER TABLE "public"."PromptTemplate"
  ADD CONSTRAINT IF NOT EXISTS "PromptTemplate_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "public"."User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."ChainTemplate"
  ADD CONSTRAINT IF NOT EXISTS "ChainTemplate_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "public"."User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."Account"
  ADD CONSTRAINT IF NOT EXISTS "Account_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "public"."User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."Session"
  ADD CONSTRAINT IF NOT EXISTS "Session_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "public"."User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

