import { prisma } from "@/lib/prisma"
import { Organization, UserRole, type AssetVisibility, type ContentBrand, type Prisma } from "@prisma/client"

/**
 * Content access rules — the single place that decides who sees what.
 *
 * Two audiences:
 *   - Employees: Colect + Le New Black staff (their login domain is marked
 *     COLECT / LE_NEW_BLACK on the Partner Access page) and every admin.
 *     They see EVERYONE and EMPLOYEES assets, plus the internal brand tag.
 *   - Partners: everyone else. They see EVERYONE assets only, and never the
 *     visibility/brand fields.
 *
 * Every read path (portal pages, homepage, search, presign, /api/v1/*, MCP)
 * must filter with `assetAccessWhere(viewer)` and shape responses with
 * `internalAssetFields(viewer, asset)` — never re-derive the rule inline.
 */

export interface Viewer {
  isEmployee: boolean
  isAdmin: boolean
  organization: Organization
}

const EMPLOYEE_ORGS: Organization[] = [Organization.COLECT, Organization.LE_NEW_BLACK]

// Domain → organisation lookups happen on every request; cache briefly so a
// page load doesn't hit AllowedDomain once per API call. A change on the
// Partner Access page takes effect within this window.
const ORG_CACHE_MS = 60_000
const orgCache = new Map<string, { org: Organization; expiresAt: number }>()

export function emailDomain(email: string): string {
  return email.split("@")[1]?.toLowerCase() ?? ""
}

async function organizationForDomain(domain: string): Promise<Organization> {
  const cached = orgCache.get(domain)
  if (cached && cached.expiresAt > Date.now()) return cached.org

  const row = await prisma.allowedDomain.findFirst({
    where: { domain, isActive: true },
    select: { organization: true },
  })
  const org = row?.organization ?? Organization.PARTNER
  orgCache.set(domain, { org, expiresAt: Date.now() + ORG_CACHE_MS })
  return org
}

/** Drop cached lookups — call after an admin edits a domain's organisation. */
export function clearOrganizationCache(): void {
  orgCache.clear()
}

export async function getViewer(user: { email: string; role: UserRole }): Promise<Viewer> {
  const organization = await organizationForDomain(emailDomain(user.email))
  const isAdmin = user.role === UserRole.ADMIN
  return {
    isAdmin,
    // Admins always count as employees — they manage internal content.
    isEmployee: isAdmin || EMPLOYEE_ORGS.includes(organization),
    organization,
  }
}

/** Partner-safe default for code paths that have no resolved user. */
export const PARTNER_VIEWER: Viewer = {
  isEmployee: false,
  isAdmin: false,
  organization: Organization.PARTNER,
}

/** Prisma filter: the assets this viewer may see. Merge into every asset `where`. */
export function assetAccessWhere(viewer: Viewer): Prisma.AssetWhereInput {
  return viewer.isEmployee ? {} : { visibility: "EVERYONE" }
}

export function canSeeAsset(viewer: Viewer, asset: { visibility: AssetVisibility }): boolean {
  return viewer.isEmployee || asset.visibility === "EVERYONE"
}

/**
 * The internal-only fields to spread into an asset response. Employees get
 * visibility + brand; partners get nothing (the keys are absent, not null, so
 * nothing hints that internal content exists).
 */
export function internalAssetFields(
  viewer: Viewer,
  asset: { visibility: AssetVisibility; brand: ContentBrand | null }
): { visibility?: AssetVisibility; brand?: ContentBrand | null } {
  if (!viewer.isEmployee) return {}
  return { visibility: asset.visibility, brand: asset.brand }
}

/**
 * Re-shape a selected asset row for the viewer: the raw visibility/brand
 * columns are replaced by `internalAssetFields`. Use this whenever a handler
 * spreads a whole row into its response, so the fields can't leak by accident.
 */
export function shapeAssetForViewer<T extends { visibility: AssetVisibility; brand: ContentBrand | null }>(
  viewer: Viewer,
  asset: T
): Omit<T, "visibility" | "brand"> & { visibility?: AssetVisibility; brand?: ContentBrand | null } {
  const { visibility, brand, ...rest } = asset
  return { ...rest, ...internalAssetFields(viewer, { visibility, brand }) }
}
