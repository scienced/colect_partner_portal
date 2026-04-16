/**
 * End-to-end verification of the AssetVariant feature.
 *
 * Exercises the full lifecycle against the Neon feature branch:
 *   1. Create an asset with EN + FR variants
 *   2. Query via the portal filter (availableLanguages has FR)
 *   3. Update: add a DE variant, change the FR variant's file
 *   4. Remove the FR variant
 *   5. Verify availableLanguages stays in sync with variants
 *   6. Verify dual-write of legacy columns
 *   7. Clean up (delete the test asset, cascade-deletes variants)
 *
 * This is a throwaway script. Delete after the feature is validated.
 *
 * Run: SEED_CONFIRM=yes npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/verify-variants.ts
 * Or:  npx tsx scripts/verify-variants.ts (if tsx is installed)
 */

import { PrismaClient, AssetType } from "@prisma/client"
import {
  projectAvailableLanguages,
  legacyColumnsFromVariants,
} from "../src/lib/assetVariants"

const prisma = new PrismaClient()

const dbHost = (process.env.DATABASE_URL || "").match(/@([^/]+)/)?.[1] || "(unknown)"

function expect(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`❌  FAIL: ${msg}`)
    process.exit(1)
  }
  console.log(`✅  ${msg}`)
}

async function main() {
  console.log(`Running variant verification against: ${dbHost}\n`)

  if (!dbHost.includes("ep-soft-shape-abtv3d5d")) {
    console.error(
      "❌  Refusing to run: DATABASE_URL is not the feature branch.\n" +
        `    Expected host containing 'ep-soft-shape-abtv3d5d', got ${dbHost}`
    )
    process.exit(1)
  }

  // --- 1. Create an asset with EN + FR variants ---
  const variantsInput = [
    {
      language: "EN",
      fileUrl: "assets/test-en.pdf",
      fileType: "pdf",
      fileSize: 123456,
      externalLink: null,
      displayOrder: 0,
    },
    {
      language: "FR",
      fileUrl: "assets/test-fr.pdf",
      fileType: "pdf",
      fileSize: 234567,
      externalLink: null,
      displayOrder: 1,
    },
  ]
  const availableLanguages = projectAvailableLanguages(variantsInput)
  const legacy = legacyColumnsFromVariants(variantsInput)

  const asset = await prisma.asset.create({
    data: {
      type: AssetType.ASSET,
      title: "[TEST] Multi-language variant verification",
      description: "Throwaway row created by scripts/verify-variants.ts",
      region: ["Global"],
      persona: ["Sales"],
      availableLanguages,
      fileUrl: legacy.fileUrl,
      fileType: legacy.fileType,
      fileSize: legacy.fileSize,
      externalLink: legacy.externalLink,
      variants: {
        create: variantsInput.map((v) => ({
          language: v.language,
          fileUrl: v.fileUrl,
          fileType: v.fileType,
          fileSize: v.fileSize,
          externalLink: v.externalLink,
          displayOrder: v.displayOrder,
        })),
      },
    },
    include: { variants: true },
  })

  console.log(`\n📦 Created asset ${asset.id}`)
  expect(asset.variants.length === 2, "create: 2 variants attached")
  expect(
    JSON.stringify(asset.availableLanguages.sort()) === JSON.stringify(["EN", "FR"]),
    "create: availableLanguages = [EN, FR]"
  )
  expect(asset.fileUrl === "assets/test-en.pdf", "create: legacy fileUrl dual-written from default (EN)")
  expect(asset.fileSize === 123456, "create: legacy fileSize dual-written from default (EN)")

  // --- 2. Query via the portal filter ---
  const frAssets = await prisma.asset.findMany({
    where: {
      availableLanguages: { has: "FR" },
      title: { startsWith: "[TEST]" },
    },
    include: { variants: true },
  })
  expect(
    frAssets.some((a) => a.id === asset.id),
    "filter: availableLanguages has FR returns the test asset"
  )

  // --- 3. Update: replace variants — add DE, change FR file ---
  const updatedVariants = [
    {
      language: "EN",
      fileUrl: "assets/test-en.pdf",
      fileType: "pdf",
      fileSize: 123456,
      externalLink: null,
      displayOrder: 0,
    },
    {
      language: "FR",
      fileUrl: "assets/test-fr-v2.pdf",
      fileType: "pdf",
      fileSize: 999999,
      externalLink: null,
      displayOrder: 1,
    },
    {
      language: "DE",
      fileUrl: null,
      fileType: null,
      fileSize: null,
      externalLink: "https://example.com/de-version",
      displayOrder: 2,
    },
  ]
  const newLangs = projectAvailableLanguages(updatedVariants)
  const newLegacy = legacyColumnsFromVariants(updatedVariants)

  await prisma.$transaction(async (tx) => {
    await tx.assetVariant.deleteMany({ where: { assetId: asset.id } })
    await tx.assetVariant.createMany({
      data: updatedVariants.map((v) => ({
        assetId: asset.id,
        language: v.language,
        fileUrl: v.fileUrl,
        fileType: v.fileType,
        fileSize: v.fileSize,
        externalLink: v.externalLink,
        displayOrder: v.displayOrder,
      })),
    })
    await tx.asset.update({
      where: { id: asset.id },
      data: {
        availableLanguages: newLangs,
        fileUrl: newLegacy.fileUrl,
        fileType: newLegacy.fileType,
        fileSize: newLegacy.fileSize,
        externalLink: newLegacy.externalLink,
      },
    })
  })

  const afterUpdate = await prisma.asset.findUnique({
    where: { id: asset.id },
    include: { variants: { orderBy: { displayOrder: "asc" } } },
  })
  expect(afterUpdate !== null, "update: asset still exists")
  expect(afterUpdate!.variants.length === 3, "update: 3 variants after add-DE")
  expect(
    JSON.stringify(afterUpdate!.availableLanguages.sort()) === JSON.stringify(["DE", "EN", "FR"]),
    "update: availableLanguages = [DE, EN, FR]"
  )
  const frVariant = afterUpdate!.variants.find((v) => v.language === "FR")
  expect(frVariant?.fileUrl === "assets/test-fr-v2.pdf", "update: FR variant file was replaced")
  const deVariant = afterUpdate!.variants.find((v) => v.language === "DE")
  expect(
    deVariant?.externalLink === "https://example.com/de-version" && deVariant?.fileUrl === null,
    "update: DE variant has externalLink, no file"
  )

  // --- 4. Remove the FR variant ---
  const withoutFR = updatedVariants.filter((v) => v.language !== "FR")
  const newLangs2 = projectAvailableLanguages(withoutFR)
  const newLegacy2 = legacyColumnsFromVariants(withoutFR)

  await prisma.$transaction(async (tx) => {
    await tx.assetVariant.deleteMany({ where: { assetId: asset.id } })
    await tx.assetVariant.createMany({
      data: withoutFR.map((v) => ({
        assetId: asset.id,
        language: v.language,
        fileUrl: v.fileUrl,
        fileType: v.fileType,
        fileSize: v.fileSize,
        externalLink: v.externalLink,
        displayOrder: v.displayOrder,
      })),
    })
    await tx.asset.update({
      where: { id: asset.id },
      data: {
        availableLanguages: newLangs2,
        fileUrl: newLegacy2.fileUrl,
        fileType: newLegacy2.fileType,
        fileSize: newLegacy2.fileSize,
        externalLink: newLegacy2.externalLink,
      },
    })
  })

  const afterRemove = await prisma.asset.findUnique({
    where: { id: asset.id },
    include: { variants: true },
  })
  expect(afterRemove!.variants.length === 2, "remove: 2 variants after dropping FR")
  expect(
    JSON.stringify(afterRemove!.availableLanguages.sort()) === JSON.stringify(["DE", "EN"]),
    "remove: availableLanguages = [DE, EN]"
  )
  expect(
    !afterRemove!.variants.some((v) => v.language === "FR"),
    "remove: no FR variant remains"
  )

  // --- 5. Clean up: delete test asset (variants cascade) ---
  await prisma.asset.delete({ where: { id: asset.id } })
  const gone = await prisma.asset.findUnique({ where: { id: asset.id } })
  expect(gone === null, "delete: test asset gone")
  const orphans = await prisma.assetVariant.findMany({ where: { assetId: asset.id } })
  expect(orphans.length === 0, "delete: cascade removed all variants")

  // --- 6. Final sanity check on the rest of the DB ---
  const totalAssets = await prisma.asset.count()
  const totalVariants = await prisma.assetVariant.count()
  const assetsWithLegacyFile = await prisma.asset.count({
    where: { OR: [{ fileUrl: { not: null } }, { externalLink: { not: null } }] },
  })
  console.log(
    `\n📊 DB totals (after cleanup): assets=${totalAssets} variants=${totalVariants} legacy-file/link=${assetsWithLegacyFile}`
  )
  expect(
    totalAssets === assetsWithLegacyFile,
    `invariant: every asset still has a legacy file or link (expand phase dual-write intact)`
  )

  console.log("\n🎉 All variant verifications passed.")
}

main()
  .catch((e) => {
    console.error("\n💥 Verification error:", e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
