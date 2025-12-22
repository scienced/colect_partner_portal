import { unstable_cache } from "next/cache"
import { prisma } from "./prisma"

// Cache duration in seconds
const SHORT_CACHE = 60 // 1 minute
const MEDIUM_CACHE = 300 // 5 minutes

/**
 * Get featured content with caching
 */
export const getFeaturedContent = unstable_cache(
  async () => {
    return prisma.featuredContent.findMany({
      where: {
        OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
      },
      orderBy: { displayOrder: "asc" },
      take: 5,
      include: {
        asset: true,
        docsUpdate: true,
        productUpdate: true,
      },
    })
  },
  ["featured-content"],
  { revalidate: MEDIUM_CACHE }
)

/**
 * Get latest assets by type with caching
 */
export const getLatestAssets = unstable_cache(
  async (type: string, limit: number = 10) => {
    return prisma.asset.findMany({
      where: {
        type: type as any,
        publishedAt: { not: null },
      },
      orderBy: { publishedAt: "desc" },
      take: limit,
    })
  },
  ["latest-assets"],
  { revalidate: SHORT_CACHE }
)

/**
 * Get docs updates with caching
 */
export const getDocsUpdates = unstable_cache(
  async (limit: number = 8) => {
    return prisma.docsUpdate.findMany({
      where: { publishedAt: { not: null } },
      orderBy: { publishedAt: "desc" },
      take: limit,
    })
  },
  ["docs-updates"],
  { revalidate: MEDIUM_CACHE }
)

/**
 * Get recently updated assets with caching
 */
export const getRecentlyUpdated = unstable_cache(
  async (limit: number = 10) => {
    return prisma.asset.findMany({
      where: {
        publishedAt: { not: null },
      },
      orderBy: { updatedAt: "desc" },
      take: limit,
    })
  },
  ["recently-updated"],
  { revalidate: SHORT_CACHE }
)

/**
 * Get all assets for a listing page with caching
 */
export const getAssetsByType = unstable_cache(
  async (type: string) => {
    return prisma.asset.findMany({
      where: {
        type: type as any,
        publishedAt: { not: null },
      },
      orderBy: { publishedAt: "desc" },
    })
  },
  ["assets-by-type"],
  { revalidate: SHORT_CACHE }
)

/**
 * Get team members with caching
 */
export const getTeamMembers = unstable_cache(
  async () => {
    return prisma.teamMember.findMany({
      orderBy: [{ department: "asc" }, { displayOrder: "asc" }],
    })
  },
  ["team-members"],
  { revalidate: MEDIUM_CACHE }
)

/**
 * Get product updates with caching
 */
export const getProductUpdates = unstable_cache(
  async () => {
    return prisma.productUpdate.findMany({
      where: { publishedAt: { not: null } },
      orderBy: { publishedAt: "desc" },
    })
  },
  ["product-updates"],
  { revalidate: MEDIUM_CACHE }
)
