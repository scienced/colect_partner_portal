/**
 * Local-only seed for testing the v1 API + MCP server.
 *
 * NOT for production. Idempotent: re-running it upserts the same domains/user
 * and mints a NEW API key each time (so you can see the issuance flow work).
 *
 * Run via:
 *   DATABASE_URL=... node scripts/seed-local-test.js
 */
const { PrismaClient, UserRole, AssetType } = require("@prisma/client")
const crypto = require("crypto")

const prisma = new PrismaClient()

const ALPHABET =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
function randomChars(n) {
  const cutoff = Math.floor(256 / ALPHABET.length) * ALPHABET.length
  let out = ""
  while (out.length < n) {
    const buf = crypto.randomBytes(n * 2)
    for (let i = 0; i < buf.length && out.length < n; i++) {
      if (buf[i] < cutoff) out += ALPHABET[buf[i] % ALPHABET.length]
    }
  }
  return out
}
const sha = (t) => crypto.createHash("sha256").update(t).digest("hex")

async function main() {
  // Domains that can log in for local testing
  for (const domain of ["colect.io", "apptitude.nl", "gmail.com"]) {
    await prisma.allowedDomain.upsert({
      where: { domain },
      update: { isActive: true },
      create: { domain, companyName: "Local test", isActive: true },
    })
  }

  const user = await prisma.user.upsert({
    where: { email: "michiel@apptitude.nl" },
    update: { role: UserRole.ADMIN, name: "Michiel (local test)" },
    create: {
      email: "michiel@apptitude.nl",
      name: "Michiel (local test)",
      role: UserRole.ADMIN,
    },
  })

  // Mint a fresh API key for this seed run
  const prefix = randomChars(8)
  const secret = randomChars(24)
  const plaintext = `colect_pk_${prefix}${secret}`
  await prisma.apiKey.create({
    data: {
      hashedKey: sha(plaintext),
      prefix,
      label: "Local smoke-test key",
      userId: user.id,
      domain: "apptitude.nl",
      scopes: ["read:portal"],
      expiresAt: null,
    },
  })

  // A bit of content so endpoints don't all come back empty
  await prisma.asset.upsert({
    where: { id: "00000000-0000-0000-0000-00000000aaaa" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-00000000aaaa",
      type: AssetType.DECK,
      title: "Local Test Deck — Sustainability Messaging",
      description:
        "Seeded deck for verifying the /api/v1/assets and /api/v1/search endpoints locally.",
      region: ["EMEA"],
      persona: ["Sales"],
      availableLanguages: ["EN"],
      publishedAt: new Date(),
    },
  })

  await prisma.docsUpdate.upsert({
    where: { id: "00000000-0000-0000-0000-00000000bbbb" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-00000000bbbb",
      title: "Local Test Docs Update",
      summary:
        "Seeded docs update for verifying /api/v1/docs-updates and /api/v1/search.",
      deepLink: "https://docs.colect.io/",
      category: "Getting Started",
      publishedAt: new Date(),
    },
  })

  await prisma.productUpdate.upsert({
    where: { id: "00000000-0000-0000-0000-00000000cccc" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-00000000cccc",
      title: "Local Test Product Update — Sustainability rollout",
      content:
        "Seeded product update for verifying /api/v1/product-updates and /api/v1/search.",
      updateType: "release_note",
      releaseDate: new Date(),
      publishedAt: new Date(),
    },
  })

  await prisma.teamMember.upsert({
    where: { id: "00000000-0000-0000-0000-00000000dddd" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-00000000dddd",
      name: "Test Person",
      role: "Sustainability Lead",
      department: "Marketing",
      bio: "Seeded directory entry for verifying /api/v1/who-is-who and /api/v1/search.",
    },
  })

  console.log(
    "\n==========================================================" +
      "\n  ✓ Local DB seeded." +
      "\n  Test API key (use as Bearer for /api/v1/*):" +
      "\n\n      " +
      plaintext +
      "\n\n==========================================================\n"
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
