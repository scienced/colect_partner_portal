-- GIN index for Asset.availableLanguages array filtering.
--
-- Category pages filter via `where: { availableLanguages: { has: "FR" } }`
-- which translates to a PostgreSQL `@>` array-containment operator. Without
-- a GIN index, this is an O(n) sequential scan. With a GIN index, it's O(log n).
--
-- Trivial at current scale (<100 assets) but important for future growth.
-- Safe to apply to production: CREATE INDEX IF NOT EXISTS is idempotent and
-- Postgres will lock the table briefly during creation.

CREATE INDEX IF NOT EXISTS "Asset_availableLanguages_gin" ON "Asset" USING gin ("availableLanguages");
