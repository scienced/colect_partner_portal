-- Multi-language asset variants (expand phase)
--
-- This migration adds the AssetVariant table so one Asset can hold multiple
-- language versions of the same content (e.g., EN + FR brochures), and
-- backfills variants from the existing legacy fileUrl/externalLink columns.
--
-- Expand-contract strategy: this migration does NOT drop the legacy
-- Asset.fileUrl / fileType / fileSize / externalLink columns. New writes
-- dual-populate them from the default variant. A follow-up migration
-- (drop_legacy_asset_file_columns) removes them after the production bake.

-- AlterTable: analytics tracks which language variant was downloaded/clicked
ALTER TABLE "AnalyticsEvent" ADD COLUMN "assetLanguage" TEXT;

-- AlterTable: rename Asset.language → Asset.availableLanguages (preserves data)
-- Prisma Migrate auto-generates DROP+ADD for column renames, which would destroy
-- the existing tag data. This RENAME is a manual edit to keep the legacy values.
ALTER TABLE "Asset" RENAME COLUMN "language" TO "availableLanguages";

-- CreateTable: one row per language version of an asset
CREATE TABLE "AssetVariant" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "fileUrl" TEXT,
    "fileType" TEXT,
    "fileSize" INTEGER,
    "externalLink" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssetVariant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssetVariant_assetId_idx" ON "AssetVariant"("assetId");

-- CreateIndex
CREATE INDEX "AssetVariant_language_idx" ON "AssetVariant"("language");

-- CreateIndex
CREATE UNIQUE INDEX "AssetVariant_assetId_language_key" ON "AssetVariant"("assetId", "language");

-- AddForeignKey
ALTER TABLE "AssetVariant" ADD CONSTRAINT "AssetVariant_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================================
-- DATA BACKFILL
-- ============================================================================
--
-- For each Asset that currently has a legacy fileUrl or externalLink, create
-- exactly one AssetVariant row. The variant's language is derived from the
-- legacy availableLanguages array (first entry, uppercased) or defaults to 'EN'.
--
-- Lossy case: if legacy availableLanguages had multiple entries (e.g., ["en",
-- "de"]) but only one fileUrl, only 'EN' gets a variant. 'DE' is effectively
-- dropped. The admin can upload missing language versions manually via the
-- new tabs-per-language form. We intentionally do NOT fan out into N identical
-- variants pointing at the same file — that would misrepresent reality.

INSERT INTO "AssetVariant" ("id", "assetId", "language", "fileUrl", "externalLink", "fileType", "fileSize", "displayOrder", "createdAt", "updatedAt")
SELECT
    gen_random_uuid()::text,
    a.id,
    COALESCE(
        CASE
            WHEN array_length(a."availableLanguages", 1) > 0
                THEN upper(a."availableLanguages"[1])
            ELSE NULL
        END,
        'EN'
    ),
    a."fileUrl",
    a."externalLink",
    a."fileType",
    a."fileSize",
    0,
    a."createdAt",
    a."updatedAt"
FROM "Asset" a
WHERE a."fileUrl" IS NOT NULL OR a."externalLink" IS NOT NULL;

-- Canonicalize availableLanguages to uppercase for ALL assets (legacy stored
-- as ["en", "nl"] etc.; new code uses "EN", "NL"). This normalizes the whole
-- column so filter queries like { has: 'FR' } match consistently.
UPDATE "Asset"
SET "availableLanguages" = (
    SELECT COALESCE(array_agg(DISTINCT upper(x) ORDER BY upper(x)), ARRAY[]::text[])
    FROM unnest("availableLanguages") x
)
WHERE array_length("availableLanguages", 1) > 0;

-- For assets that now have variants, rewrite availableLanguages to be exactly
-- the set of variant languages. This collapses legacy multi-language tags down
-- to "what partners can actually download" — the source of truth going forward.
-- Assets without variants (drafts / placeholder rows) keep their legacy tags
-- from the canonicalization step above.
UPDATE "Asset" a
SET "availableLanguages" = sub.langs
FROM (
    SELECT "assetId", array_agg(DISTINCT "language" ORDER BY "language") AS langs
    FROM "AssetVariant"
    GROUP BY "assetId"
) sub
WHERE a.id = sub."assetId";
