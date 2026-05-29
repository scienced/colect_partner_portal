#!/usr/bin/env node

/**
 * Colect Partner Portal MCP server.
 *
 * Thin stdio wrapper around the portal's REST API (/api/v1/*). Every tool is
 * one fetch with the user's API key in the Authorization header — there is no
 * other state. The portal is the source of truth; this server just exists to
 * make Claude Desktop / Claude Code happy.
 *
 * Config via env:
 *   PORTAL_API_KEY   — required. Personal key from /settings/api-keys.
 *   PORTAL_BASE_URL  — optional. Defaults to https://partnerportal.colect.io.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { z } from "zod"

const API_KEY = process.env.PORTAL_API_KEY
const BASE_URL = (process.env.PORTAL_BASE_URL || "https://partnerportal.colect.io").replace(/\/$/, "")
const VERSION = "1.0.0"

if (!API_KEY) {
  console.error(
    "Colect MCP: PORTAL_API_KEY env var is required. " +
    "Generate one at https://partnerportal.colect.io/settings/api-keys"
  )
  process.exit(1)
}

async function apiGet(path, query) {
  const url = new URL(`${BASE_URL}${path}`)
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null || v === "") continue
      url.searchParams.set(k, Array.isArray(v) ? v.join(",") : String(v))
    }
  }
  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      Accept: "application/json",
      "User-Agent": `ColectMCP/${VERSION}`,
      // Tags every call in the portal's analytics as MCP_QUERY (vs raw API).
      "X-Colect-Source": "mcp",
    },
  })
  const text = await res.text()
  let parsed
  try { parsed = JSON.parse(text) } catch { parsed = { raw: text } }
  if (!res.ok) {
    const message = parsed?.error?.message || `HTTP ${res.status}`
    throw new Error(`Portal API ${res.status}: ${message}`)
  }
  return parsed
}

/** MCP tool handlers return { content: [{type:"text", text:"..."}] }. */
function jsonContent(value) {
  return { content: [{ type: "text", text: JSON.stringify(value, null, 2) }] }
}

const server = new McpServer({ name: "colect-portal", version: VERSION })

server.registerTool(
  "portal_me",
  {
    description:
      "Identify the calling API key and confirm portal access. Smoke test — use this first if you're unsure the integration is wired up.",
    inputSchema: {},
  },
  async () => jsonContent(await apiGet("/api/v1/me"))
)

server.registerTool(
  "portal_search",
  {
    description:
      "Full-text search across portal content (assets, docs updates, product updates, team members, featured items). Returns ranked, interleaved results. Use this as the default way to answer 'find me X' questions.",
    inputSchema: {
      q: z.string().min(2).describe("The search query."),
      types: z
        .array(z.enum(["asset", "docs_update", "product_update", "team_member", "featured"]))
        .optional()
        .describe("Restrict to a subset of result types."),
      limitPerType: z.number().int().min(1).max(25).optional().describe("Default 5."),
    },
  },
  async ({ q, types, limitPerType }) =>
    jsonContent(await apiGet("/api/v1/search", { q, types, limitPerType }))
)

server.registerTool(
  "portal_list_assets",
  {
    description:
      "List published assets (decks, campaigns, videos, links). Use filters to narrow down before falling back to search.",
    inputSchema: {
      type: z.enum(["DECK", "CAMPAIGN", "VIDEO", "ASSET"]).optional(),
      region: z.string().optional().describe("e.g. EMEA, APAC, Americas"),
      persona: z.string().optional().describe("e.g. Sales, Marketing, Technical"),
      language: z.string().optional().describe("e.g. EN, FR, DE, NL"),
      limit: z.number().int().min(1).max(100).optional(),
      offset: z.number().int().min(0).optional(),
    },
  },
  async (args) => jsonContent(await apiGet("/api/v1/assets", args))
)

server.registerTool(
  "portal_get_asset",
  {
    description:
      "Get one asset's full detail, including per-language download URLs (presigned, expire in ~5 minutes).",
    inputSchema: { id: z.string().uuid() },
  },
  async ({ id }) => jsonContent(await apiGet(`/api/v1/assets/${encodeURIComponent(id)}`))
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
  async (args) => jsonContent(await apiGet("/api/v1/docs-updates", args))
)

server.registerTool(
  "portal_list_product_updates",
  {
    description:
      "List product update entries (release notes and upcoming items). Filter `updateType` to one of release_note | coming_up.",
    inputSchema: {
      updateType: z.enum(["release_note", "coming_up"]).optional(),
      limit: z.number().int().min(1).max(100).optional(),
      offset: z.number().int().min(0).optional(),
    },
  },
  async (args) => jsonContent(await apiGet("/api/v1/product-updates", args))
)

server.registerTool(
  "portal_list_who_is_who",
  {
    description: "List members of the Colect Who's Who directory. Filter by department.",
    inputSchema: {
      department: z.string().optional(),
      limit: z.number().int().min(1).max(100).optional(),
      offset: z.number().int().min(0).optional(),
    },
  },
  async (args) => jsonContent(await apiGet("/api/v1/who-is-who", args))
)

server.registerTool(
  "portal_list_featured",
  {
    description: "List currently-active featured items on the portal homepage.",
    inputSchema: {},
  },
  async () => jsonContent(await apiGet("/api/v1/featured"))
)

const transport = new StdioServerTransport()
await server.connect(transport)
