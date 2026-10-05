-- CreateEnum
CREATE TYPE "AssetVisibility" AS ENUM ('EVERYONE', 'EMPLOYEES');

-- CreateEnum
CREATE TYPE "ContentBrand" AS ENUM ('COLECT', 'LE_NEW_BLACK', 'BOTH');

-- CreateEnum
CREATE TYPE "Organization" AS ENUM ('PARTNER', 'COLECT', 'LE_NEW_BLACK');

-- NOTE: Prisma's diff wants to drop "Asset_availableLanguages_gin" because
-- that GIN index was created by hand in 20260415130000 and isn't expressible
-- in schema.prisma. Keep it — the drop was removed deliberately.

-- AlterTable
ALTER TABLE "AllowedDomain" ADD COLUMN     "organization" "Organization" NOT NULL DEFAULT 'PARTNER';

-- AlterTable
ALTER TABLE "Asset" ADD COLUMN     "brand" "ContentBrand",
ADD COLUMN     "visibility" "AssetVisibility" NOT NULL DEFAULT 'EVERYONE';

-- CreateIndex
CREATE INDEX "Asset_visibility_idx" ON "Asset"("visibility");

-- Data: mark the two employee organisations' login domains. Any other
-- domain stays PARTNER; admins can change this on the Partner Access page.
UPDATE "AllowedDomain" SET "organization" = 'COLECT' WHERE "domain" = 'colect.io';
UPDATE "AllowedDomain" SET "organization" = 'LE_NEW_BLACK' WHERE "domain" = 'lenewblack.com';
