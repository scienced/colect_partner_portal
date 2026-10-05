/**
 * Runs once when the server process starts (Next.js instrumentation hook).
 *
 * Warms the slow, first-request-only costs so the first visitor after a
 * deploy or restart doesn't pay for them:
 *   - GitBook docs feed: a full fetch takes ~3–4 s (see src/lib/gitbook.ts).
 *   - Database: opens Prisma's connection pool and wakes a scaled-to-zero
 *     Neon compute (~1–1.5 s cold).
 * Fire-and-forget: never delays or breaks server start.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return

  const [{ prisma }, { warmGitBookCache }] = await Promise.all([
    import("@/lib/prisma"),
    import("@/lib/gitbook"),
  ])

  const started = Date.now()
  Promise.allSettled([prisma.$queryRaw`SELECT 1`, warmGitBookCache()]).then(([db, gitbook]) => {
    console.log(
      `[warmup] done in ${Date.now() - started} ms — db: ${db.status}, gitbook: ${gitbook.status}`
    )
  })
}
