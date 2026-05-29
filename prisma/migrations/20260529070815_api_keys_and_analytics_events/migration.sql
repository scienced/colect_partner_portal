-- Add new event types for REST + MCP tracking
ALTER TYPE "AnalyticsEventType" ADD VALUE 'API_QUERY';
ALTER TYPE "AnalyticsEventType" ADD VALUE 'MCP_QUERY';

-- ApiKey table — see prisma/schema.prisma for the trust-model rationale.
CREATE TABLE "ApiKey" (
    "id"          TEXT NOT NULL,
    "hashedKey"   TEXT NOT NULL,
    "prefix"      TEXT NOT NULL,
    "label"       TEXT NOT NULL,
    "userId"      TEXT NOT NULL,
    "domain"      TEXT NOT NULL,
    "scopes"      TEXT[],
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt"   TIMESTAMP(3),
    "lastUsedAt"  TIMESTAMP(3),
    "lastUsedIp"  TEXT,
    "revokedAt"   TIMESTAMP(3),

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ApiKey_hashedKey_key" ON "ApiKey"("hashedKey");
CREATE INDEX "ApiKey_userId_idx"   ON "ApiKey"("userId");
CREATE INDEX "ApiKey_domain_idx"   ON "ApiKey"("domain");
CREATE INDEX "ApiKey_revokedAt_idx" ON "ApiKey"("revokedAt");

ALTER TABLE "ApiKey"
    ADD CONSTRAINT "ApiKey_userId_fkey" FOREIGN KEY ("userId")
        REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AnalyticsEvent: add apiKeyId for audit ("which key did what"). Soft-link
-- (SET NULL on key delete) so revoking a key doesn't lose its trail.
ALTER TABLE "AnalyticsEvent" ADD COLUMN "apiKeyId" TEXT;

CREATE INDEX "AnalyticsEvent_apiKeyId_idx" ON "AnalyticsEvent"("apiKeyId");

ALTER TABLE "AnalyticsEvent"
    ADD CONSTRAINT "AnalyticsEvent_apiKeyId_fkey" FOREIGN KEY ("apiKeyId")
        REFERENCES "ApiKey"("id") ON DELETE SET NULL ON UPDATE CASCADE;
