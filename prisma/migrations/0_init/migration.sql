-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('DECK', 'CAMPAIGN', 'ASSET', 'VIDEO');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PARTNER', 'ADMIN');

-- CreateEnum
CREATE TYPE "AnalyticsEventType" AS ENUM ('PAGE_VIEW', 'ASSET_CLICK', 'ASSET_DOWNLOAD', 'SEARCH_QUERY');

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "type" "AnalyticsEventType" NOT NULL,
    "userId" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "userDomain" TEXT NOT NULL,
    "pagePath" TEXT,
    "assetId" TEXT,
    "assetTitle" TEXT,
    "assetType" TEXT,
    "searchQuery" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'PARTNER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "type" "AssetType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fileUrl" TEXT,
    "thumbnailUrl" TEXT,
    "blurDataUrl" TEXT,
    "fileType" TEXT,
    "fileSize" INTEGER,
    "region" TEXT[],
    "language" TEXT[],
    "persona" TEXT[],
    "campaignGoal" TEXT,
    "campaignLink" TEXT,
    "templateContent" TEXT,
    "sentAt" TIMESTAMP(3),
    "externalLink" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "pinnedAt" TIMESTAMP(3),
    "pinExpiresAt" TIMESTAMP(3),
    "pinOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocsUpdate" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "deepLink" TEXT NOT NULL,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "pinnedAt" TIMESTAMP(3),
    "pinExpiresAt" TIMESTAMP(3),
    "pinOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DocsUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductUpdate" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "updateType" TEXT NOT NULL,
    "releaseDate" TIMESTAMP(3),
    "link" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "ProductUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "email" TEXT,
    "photoUrl" TEXT,
    "bio" TEXT,
    "linkedIn" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Changelog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityTitle" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assetId" TEXT,
    "docsUpdateId" TEXT,
    "productUpdateId" TEXT,

    CONSTRAINT "Changelog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeaturedContent" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "entityType" TEXT NOT NULL,
    "assetId" TEXT,
    "docsUpdateId" TEXT,
    "productUpdateId" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeaturedContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DigestState" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "lastSentAt" TIMESTAMP(3),
    "lastStatus" TEXT,
    "recipientCount" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DigestState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AllowedDomain" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "companyName" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AllowedDomain_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnalyticsEvent_type_idx" ON "AnalyticsEvent"("type");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_userId_idx" ON "AnalyticsEvent"("userId");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_userDomain_idx" ON "AnalyticsEvent"("userDomain");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_createdAt_idx" ON "AnalyticsEvent"("createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_type_createdAt_idx" ON "AnalyticsEvent"("type", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Asset_type_idx" ON "Asset"("type");

-- CreateIndex
CREATE INDEX "Asset_createdAt_idx" ON "Asset"("createdAt");

-- CreateIndex
CREATE INDEX "Asset_updatedAt_idx" ON "Asset"("updatedAt");

-- CreateIndex
CREATE INDEX "Asset_publishedAt_idx" ON "Asset"("publishedAt");

-- CreateIndex
CREATE INDEX "Asset_type_isPinned_idx" ON "Asset"("type", "isPinned");

-- CreateIndex
CREATE INDEX "DocsUpdate_category_idx" ON "DocsUpdate"("category");

-- CreateIndex
CREATE INDEX "DocsUpdate_createdAt_idx" ON "DocsUpdate"("createdAt");

-- CreateIndex
CREATE INDEX "DocsUpdate_publishedAt_idx" ON "DocsUpdate"("publishedAt");

-- CreateIndex
CREATE INDEX "DocsUpdate_isPinned_idx" ON "DocsUpdate"("isPinned");

-- CreateIndex
CREATE INDEX "ProductUpdate_updateType_idx" ON "ProductUpdate"("updateType");

-- CreateIndex
CREATE INDEX "ProductUpdate_releaseDate_idx" ON "ProductUpdate"("releaseDate");

-- CreateIndex
CREATE INDEX "ProductUpdate_publishedAt_idx" ON "ProductUpdate"("publishedAt");

-- CreateIndex
CREATE INDEX "TeamMember_department_idx" ON "TeamMember"("department");

-- CreateIndex
CREATE INDEX "TeamMember_displayOrder_idx" ON "TeamMember"("displayOrder");

-- CreateIndex
CREATE INDEX "Changelog_createdAt_idx" ON "Changelog"("createdAt");

-- CreateIndex
CREATE INDEX "Changelog_entityType_idx" ON "Changelog"("entityType");

-- CreateIndex
CREATE INDEX "FeaturedContent_startDate_idx" ON "FeaturedContent"("startDate");

-- CreateIndex
CREATE INDEX "FeaturedContent_endDate_idx" ON "FeaturedContent"("endDate");

-- CreateIndex
CREATE INDEX "FeaturedContent_displayOrder_idx" ON "FeaturedContent"("displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "AllowedDomain_domain_key" ON "AllowedDomain"("domain");

-- CreateIndex
CREATE INDEX "AllowedDomain_domain_idx" ON "AllowedDomain"("domain");

-- CreateIndex
CREATE INDEX "AllowedDomain_isActive_idx" ON "AllowedDomain"("isActive");

-- AddForeignKey
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Changelog" ADD CONSTRAINT "Changelog_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Changelog" ADD CONSTRAINT "Changelog_docsUpdateId_fkey" FOREIGN KEY ("docsUpdateId") REFERENCES "DocsUpdate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Changelog" ADD CONSTRAINT "Changelog_productUpdateId_fkey" FOREIGN KEY ("productUpdateId") REFERENCES "ProductUpdate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeaturedContent" ADD CONSTRAINT "FeaturedContent_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeaturedContent" ADD CONSTRAINT "FeaturedContent_docsUpdateId_fkey" FOREIGN KEY ("docsUpdateId") REFERENCES "DocsUpdate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeaturedContent" ADD CONSTRAINT "FeaturedContent_productUpdateId_fkey" FOREIGN KEY ("productUpdateId") REFERENCES "ProductUpdate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

