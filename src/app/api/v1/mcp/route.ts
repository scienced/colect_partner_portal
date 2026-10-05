import { NextRequest } from "next/server"
import { z } from "zod"
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js"
import { prisma } from "@/lib/prisma"
import { findActiveKeyByPlaintext, parseAuthorizationHeader } from "@/lib/apiKeys"
import { canWriteContent } from "@/lib/v1Content"
import { getCanonicalOrigin, httpErrors } from "@/lib/v1Response"
import { SUPPORTED_LANGUAGES } from "@/lib/assetVariants"
import { GET as listAssets, POST as createAsset } from "@/app/api/v1/assets/route"
import { GET as getAsset, PATCH as updateAsset } from "@/app/api/v1/assets/[id]/route"
import { POST as createUpload } from "@/app/api/v1/uploads/route"
import { GET as me } from "@/app/api/v1/me/route"
import { GET as search } from "@/app/api/v1/search/route"
import { GET as listDocsUpdates } from "@/app/api/v1/docs-updates/route"
import { GET as listProductUpdates } from "@/app/api/v1/product-updates/route"
import { GET as listWhoIsWho } from "@/app/api/v1/who-is-who/route"
import { GET as listFeatured } from "@/app/api/v1/featured/route"
import { GET as listRecent } from "@/app/api/v1/recent/route"
import { GET as listSocialAds, POST as createSocialAd } from "@/app/api/v1/social-ads/route"
import { GET as getSocialAd, PATCH as updateSocialAd } from "@/app/api/v1/social-ads/[id]/route"

/**
 * Hosted MCP server (Streamable HTTP) — https://<portal>/api/v1/mcp
 *
 * Replaces the need to install the stdio server in mcp-server/. Clients
 * connect with the same `colect_pk_…` API key as a Bearer token. Every tool
 * runs the matching /api/v1 route handler in-process with that key, so auth,
 * visibility rules, rate limits and the MCP_QUERY audit trail are exactly the
 * REST API's — there is no second implementation to drift.
 *
 * Stateless: a fresh server + transport per HTTP request (no session store),
 * which is what a single DO instance behind a proxy wants.
 */

export const dynamic = "force-dynamic"

const VERSION = "2.0.0"

type Handler = (request: NextRequest, ctx: never) => Promise<Response>

interface CallOpts {
  query?: Record<string, unknown>
  body?: unknown
  params?: Record<string, string>
}

function jsonContent(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] }
}

function buildServer(request: NextRequest, canWrite: boolean) {
  const origin = getCanonicalOrigin(request)
  const authorization = request.headers.get("authorization") ?? ""
  const forwardedFor = request.headers.get("x-forwarded-for")

  /** Invoke a v1 route handler as if the MCP client had called it directly. */
  async function call(handler: Handler, method: string, path: string, opts: CallOpts = {}) {
    const url = new URL(path, origin)
    for (const [k, v] of Object.entries(opts.query ?? {})) {
      if (v === undefined || v === null || v === "") continue
      url.searchParams.set(k, Array.isArray(v) ? v.join(",") : String(v))
    }
    const headers: Record<string, string> = {
      authorization,
      // Tags the audit event as MCP_QUERY (see v1Auth.detectSource).
      "x-colect-source": "mcp",
      "user-agent": `ColectMCP/${VERSION} (hosted)`,
    }
    if (forwardedFor) headers["x-forwarded-for"] = forwardedFor
    if (opts.body !== undefined) headers["content-type"] = "application/json"

    const res = await handler(
      new NextRequest(url, {
        method,
        headers,
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      }),
      { params: Promise.resolve(opts.params ?? {}) } as never
    )
    const parsed = await res.json().catch(() => null)
    if (!res.ok) {
      const message = parsed?.error?.message || `HTTP ${res.status}`
      return { isError: true, content: [{ type: "text" as const, text: `Portal API ${res.status}: ${message}` }] }
    }
    return jsonContent(parsed)
  }

  const server = new McpServer(
    { name: "colect-portal", version: VERSION },
    {
      instructions:
        "Colect Partner Portal: sales decks, campaigns, videos, assets, documentation updates and the team directory. " +
        "Use portal_search or portal_list_recent first. Asset results include a direct `download` URL." +
        (canWrite
          ? " This key can also create and edit content: portal_create_upload → PUT the bytes → portal_create_asset. " +
            "Always set `visibility` deliberately: EVERYONE is shown to partners, EMPLOYEES only to Colect and Le New Black staff."
          : ""),
    }
  )

  // ── Read tools (every key) ────────────────────────────────────────────────
  server.registerTool(
    "portal_me",
    {
      description:
        "Identify the calling API key: who owns it, whether they're an employee or partner, and whether it can write content. Use first to check the connection.",
      inputSchema: {},
    },
    async () => call(me as Handler, "GET", "/api/v1/me")
  )

  server.registerTool(
    "portal_search",
    {
      description:
        "Full-text search across portal content (assets, docs updates, product updates, team members, featured items). Ranked results with match-highlighted snippets (**bold**). Asset results carry an inline `download` object with the direct file URL. Default way to answer 'find me X'.",
      inputSchema: {
        q: z.string().min(2).describe("The search query."),
        types: z
          .array(z.enum(["asset", "docs_update", "product_update", "team_member", "featured"]))
          .optional()
          .describe("Restrict to a subset of result types."),
        limitPerType: z.number().int().min(1).max(25).optional().describe("Default 5."),
      },
    },
    async (args) => call(search as Handler, "GET", "/api/v1/search", { query: args })
  )

  server.registerTool(
    "portal_list_assets",
    {
      description:
        "List assets (decks, campaigns, videos, links), newest first. Each item has an inline `download` object with the file URL. Employees also get `visibility` and `brand` on each item and can filter on them.",
      inputSchema: {
        type: z.enum(["DECK", "CAMPAIGN", "VIDEO", "ASSET"]).optional(),
        region: z.string().optional().describe("e.g. EMEA, APAC, Americas"),
        persona: z.string().optional().describe("e.g. Sales, Marketing, Technical"),
        language: z.string().optional().describe("e.g. EN, FR, DE, NL"),
        visibility: z.enum(["EVERYONE", "EMPLOYEES"]).optional().describe("Employees only."),
        brand: z
          .enum(["COLECT", "LE_NEW_BLACK", "BOTH"])
          .optional()
          .describe("Employees only. COLECT / LE_NEW_BLACK also include BOTH."),
        status: z
          .enum(["published", "draft", "all"])
          .optional()
          .describe("Default published. draft/all need a key with content write access."),
        limit: z.number().int().min(1).max(100).optional(),
        offset: z.number().int().min(0).optional(),
      },
    },
    async (args) => call(listAssets as Handler, "GET", "/api/v1/assets", { query: args })
  )

  server.registerTool(
    "portal_get_asset",
    {
      description:
        "One asset's full detail, including per-language download URLs (presigned; re-fetch after `downloadUrlExpiresAt`).",
      inputSchema: { id: z.string().uuid() },
    },
    async ({ id }) =>
      call(getAsset as Handler, "GET", `/api/v1/assets/${encodeURIComponent(id)}`, { params: { id } })
  )

  server.registerTool(
    "portal_list_docs_updates",
    {
      description: "List recently updated documentation entries.",
      inputSchema: {
        category: z.string().optional(),
        limit: z.number().int().min(1).max(100).optional(),
        offset: z.number().int().min(0).optional(),
      },
    },
    async (args) => call(listDocsUpdates as Handler, "GET", "/api/v1/docs-updates", { query: args })
  )

  server.registerTool(
    "portal_list_product_updates",
    {
      description: "List product update entries (release notes and upcoming items).",
      inputSchema: {
        updateType: z.enum(["release_note", "coming_up"]).optional(),
        limit: z.number().int().min(1).max(100).optional(),
        offset: z.number().int().min(0).optional(),
      },
    },
    async (args) => call(listProductUpdates as Handler, "GET", "/api/v1/product-updates", { query: args })
  )

  server.registerTool(
    "portal_list_who_is_who",
    {
      description: "List members of the Who's Who team directory. Filter by department.",
      inputSchema: {
        department: z.string().optional(),
        limit: z.number().int().min(1).max(100).optional(),
        offset: z.number().int().min(0).optional(),
      },
    },
    async (args) => call(listWhoIsWho as Handler, "GET", "/api/v1/who-is-who", { query: args })
  )

  server.registerTool(
    "portal_list_featured",
    {
      description: "List currently active featured items on the portal homepage.",
      inputSchema: {},
    },
    async () => call(listFeatured as Handler, "GET", "/api/v1/featured")
  )

  server.registerTool(
    "portal_list_recent",
    {
      description:
        "Unified 'what's new' feed across assets, docs updates and product updates, most recently updated first. Call this before merging several list calls yourself.",
      inputSchema: {
        types: z.array(z.enum(["asset", "docs_update", "product_update"])).optional(),
        since: z.string().datetime().optional().describe("ISO 8601 — only items updated after this."),
        limit: z.number().int().min(1).max(100).optional().describe("Default 20."),
      },
    },
    async (args) => call(listRecent as Handler, "GET", "/api/v1/recent", { query: args })
  )

  server.registerTool(
    "portal_list_social_ads",
    {
      description:
        "List LinkedIn ad sets. Each ad set groups a campaign's visuals (`media`, with presigned `url`s, in carousel order) and its copy versions (`copies`: introText, headline, ctaLabel, destinationUrl).",
      inputSchema: {
        brand: z.enum(["COLECT", "LE_NEW_BLACK", "BOTH"]).optional().describe("Employees only. COLECT / LE_NEW_BLACK also include BOTH."),
        status: z.enum(["published", "all"]).optional().describe("Default published. all needs a key with content write access."),
        limit: z.number().int().min(1).max(50).optional(),
        offset: z.number().int().min(0).optional(),
      },
    },
    async (args) => call(listSocialAds as Handler, "GET", "/api/v1/social-ads", { query: args })
  )

  server.registerTool(
    "portal_get_social_ad",
    {
      description: "One LinkedIn ad set with all visuals (presigned URLs) and copy versions.",
      inputSchema: { id: z.string().uuid() },
    },
    async ({ id }) =>
      call(getSocialAd as Handler, "GET", `/api/v1/social-ads/${encodeURIComponent(id)}`, { params: { id } })
  )

  // ── Write tools (admin keys with content write access only) ───────────────
  if (!canWrite) return server

  const language = z.enum(SUPPORTED_LANGUAGES)
  const fileInput = z.object({
    language: language.describe("Language of this version."),
    fileUrl: z
      .string()
      .url()
      .optional()
      .describe("`fileUrl` from portal_create_upload (purpose file), after the bytes were PUT."),
    externalLink: z.string().url().optional().describe("Link instead of (or as well as) a file, e.g. YouTube or Google Slides."),
  })
  const contentFields = {
    title: z.string().min(1).max(200),
    description: z.string().max(5000).optional(),
    brand: z
      .enum(["COLECT", "LE_NEW_BLACK", "BOTH"])
      .nullable()
      .optional()
      .describe("Optional internal tag: who the content is for. Only employees ever see it."),
    publish: z
      .boolean()
      .optional()
      .describe("true = live in the portal now. Omit/false on create = saved as a draft."),
    thumbnailUrl: z
      .string()
      .url()
      .optional()
      .describe("`fileUrl` from portal_create_upload (purpose thumbnail). Resized to 800×450 automatically."),
    persona: z.array(z.string()).optional().describe("e.g. Sales, Marketing, Technical, Executive"),
    region: z.array(z.string()).optional().describe("e.g. EMEA, APAC, Americas"),
    campaignGoal: z.string().optional().describe("Campaigns only."),
    campaignLink: z.string().url().optional().describe("Campaigns only: link to HubSpot/Mailchimp etc."),
    sentAt: z.string().datetime().optional().describe("Campaigns only: when the email was/will be sent."),
  }

  server.registerTool(
    "portal_create_upload",
    {
      description:
        "Step 1 of uploading a file: returns a short-lived `uploadUrl`. Step 2: PUT the raw bytes there with the returned Content-Type header, e.g. `curl -X PUT -H 'Content-Type: application/pdf' --data-binary @deck.pdf '<uploadUrl>'`. Step 3: pass `fileUrl` to portal_create_asset / portal_update_asset. Links (YouTube, Google Slides, Figma) need no upload — use `externalLink` instead.",
      inputSchema: {
        filename: z.string().min(1).describe("e.g. sustainability-deck.pdf"),
        contentType: z.string().min(3).describe("MIME type, e.g. application/pdf, image/png, video/mp4"),
        purpose: z.enum(["file", "thumbnail"]).optional().describe("Default file. Use thumbnail for a cover image."),
        assetType: z
          .enum(["DECK", "CAMPAIGN", "ASSET", "VIDEO", "SOCIAL_AD"])
          .optional()
          .describe("Type of the asset this file is for (picks the storage folder)."),
      },
    },
    async (args) => call(createUpload as Handler, "POST", "/api/v1/uploads", { body: args })
  )

  server.registerTool(
    "portal_create_asset",
    {
      description:
        "Create a deck, campaign, video or asset. `visibility` is required: EVERYONE shows it to partners, Colect and Le New Black; EMPLOYEES only to Colect and Le New Black staff. Saved as a draft unless `publish: true`. Each language version is one entry in `files`.",
      inputSchema: {
        type: z.enum(["DECK", "CAMPAIGN", "ASSET", "VIDEO"]),
        visibility: z.enum(["EVERYONE", "EMPLOYEES"]),
        files: z.array(fileInput).min(1).describe("One entry per language version."),
        ...contentFields,
      },
    },
    async (args) => call(createAsset as Handler, "POST", "/api/v1/assets", { body: args })
  )

  server.registerTool(
    "portal_update_asset",
    {
      description:
        "Edit an existing asset. Send only the fields to change. `files`, when sent, replaces ALL language versions — include the ones to keep. Use `publish` true/false to publish or unpublish, and `visibility` to switch between EVERYONE and EMPLOYEES. Deleting is not possible via the API.",
      inputSchema: {
        id: z.string().uuid(),
        type: z.enum(["DECK", "CAMPAIGN", "ASSET", "VIDEO"]).optional(),
        visibility: z.enum(["EVERYONE", "EMPLOYEES"]).optional(),
        files: z.array(fileInput).min(1).optional(),
        ...contentFields,
        title: contentFields.title.optional(),
      },
    },
    async ({ id, ...body }) =>
      call(updateAsset as Handler, "PATCH", `/api/v1/assets/${encodeURIComponent(id)}`, {
        params: { id },
        body,
      })
  )

  const adCopyInput = z.object({
    introText: z.string().min(1).describe("LinkedIn introductory text (shows above the visual)."),
    headline: z.string().optional(),
    description: z.string().optional(),
    ctaLabel: z.string().optional().describe("e.g. Learn more, Request demo, Download, Sign up"),
    destinationUrl: z.string().url().optional(),
    language: language.optional(),
    label: z.string().optional().describe("e.g. Version A, Retargeting"),
  })
  const adSetFields = {
    title: z.string().min(1).max(200).describe("One ad set per campaign, e.g. 'Q4 retargeting — Le New Black'."),
    description: z.string().optional().describe("Internal notes: goal, audience, when it ran."),
    brand: contentFields.brand,
    publish: contentFields.publish,
    media: z
      .array(z.object({ fileUrl: z.string().url().describe("`fileUrl` from portal_create_upload with assetType SOCIAL_AD."), fileName: z.string().optional() }))
      .min(1)
      .describe("Visuals in carousel order; the first is the cover."),
    copies: z.array(adCopyInput).optional().describe("Copy versions for this ad set."),
  }

  server.registerTool(
    "portal_create_social_ad",
    {
      description:
        "Create a LinkedIn ad set: upload each visual with portal_create_upload (assetType SOCIAL_AD) and PUT the bytes, then call this with the fileUrls and the copy. `visibility` is required — ad sets are usually EMPLOYEES (internal). Draft unless `publish: true`.",
      inputSchema: { visibility: z.enum(["EVERYONE", "EMPLOYEES"]), ...adSetFields },
    },
    async (args) => call(createSocialAd as Handler, "POST", "/api/v1/social-ads", { body: args })
  )

  server.registerTool(
    "portal_update_social_ad",
    {
      description:
        "Edit a LinkedIn ad set. Send only what changes. `media` / `copies`, when sent, replace the whole list — include the ones to keep (existing visuals keep their `fileUrl` from portal_get_social_ad).",
      inputSchema: {
        id: z.string().uuid(),
        visibility: z.enum(["EVERYONE", "EMPLOYEES"]).optional(),
        ...adSetFields,
        title: adSetFields.title.optional(),
        media: adSetFields.media.optional(),
      },
    },
    async ({ id, ...body }) =>
      call(updateSocialAd as Handler, "PATCH", `/api/v1/social-ads/${encodeURIComponent(id)}`, { params: { id }, body })
  )

  return server
}

async function handle(request: NextRequest): Promise<Response> {
  // Authenticate the MCP request itself so clients get a clean 401 before any
  // protocol exchange. Per-tool calls re-check the key via the v1 handlers.
  const plaintext = parseAuthorizationHeader(request.headers.get("authorization"))
  const apiKey = plaintext ? await findActiveKeyByPlaintext(plaintext) : null
  const user = apiKey ? await prisma.user.findUnique({ where: { id: apiKey.userId } }) : null
  if (!apiKey || !user) {
    const res = httpErrors.unauthorized(
      "Provide a valid colect_pk_… API key as a Bearer token. Create one at /settings/api-keys."
    )
    res.headers.set("WWW-Authenticate", 'Bearer realm="colect-portal"')
    return res
  }

  const server = buildServer(request, canWriteContent({ apiKey, user }))
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless
    enableJsonResponse: true,
  })
  await server.connect(transport)
  try {
    return await transport.handleRequest(request)
  } catch (e) {
    console.error("[mcp] request failed:", e)
    return httpErrors.serverError()
  }
}

export const POST = handle
export const GET = handle
export const DELETE = handle
