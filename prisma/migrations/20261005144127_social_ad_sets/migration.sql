-- AlterEnum
ALTER TYPE "AssetType" ADD VALUE 'SOCIAL_AD';

-- (Prisma wants to drop the hand-made "Asset_availableLanguages_gin" index; kept on purpose.)

-- AlterTable
ALTER TABLE "Asset" ADD COLUMN     "adPlatform" TEXT;

-- CreateTable
CREATE TABLE "AssetMedia" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT,
    "fileType" TEXT,
    "fileSize" INTEGER,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssetMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdCopy" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "language" TEXT,
    "label" TEXT,
    "introText" TEXT NOT NULL,
    "headline" TEXT,
    "description" TEXT,
    "ctaLabel" TEXT,
    "destinationUrl" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdCopy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssetMedia_assetId_idx" ON "AssetMedia"("assetId");

-- CreateIndex
CREATE INDEX "AdCopy_assetId_idx" ON "AdCopy"("assetId");

-- AddForeignKey
ALTER TABLE "AssetMedia" ADD CONSTRAINT "AssetMedia_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdCopy" ADD CONSTRAINT "AdCopy_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
