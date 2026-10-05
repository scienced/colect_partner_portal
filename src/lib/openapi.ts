/**
 * OpenAPI 3.1 spec for the Colect Partner Portal API.
 *
 * Single source of truth: the public docs page renders from this, the MCP
 * server's tool list mirrors it, and agents can fetch it directly at
 * `/api/v1/openapi.json` to use as a tool catalog.
 *
 * Keep this hand-edited (it's a typed object, not a code-generated artifact)
 * so it doubles as readable in-repo documentation.
 */

export const SPEC_VERSION = "1.1.0"

export function buildOpenApiSpec(origin: string) {
  return {
    openapi: "3.1.0",
    info: {
      title: "Colect Partner Portal API",
      version: SPEC_VERSION,
      description:
        "Access to the same content the key's owner sees in the portal — " +
        "assets (decks, campaigns, videos), documentation updates, product " +
        "updates, featured content, and the Who's Who directory. Designed for " +
        "AI agents (Claude, Claude Code, custom tooling) and headless " +
        "integrations.\n\n" +
        "Authentication: send your API key as `Authorization: Bearer " +
        "colect_pk_…`. Generate keys at /settings/api-keys.\n\n" +
        "Audiences: keys owned by Colect or Le New Black staff (employees) also " +
        "see assets with `visibility: EMPLOYEES` and the `visibility`/`brand` " +
        "fields. Other keys never see either.\n\n" +
        "Writing: admins can create keys with content write access " +
        "(`write:content`). Those keys can upload files and create/edit assets " +
        "(POST /api/v1/uploads, POST /api/v1/assets, PATCH /api/v1/assets/{id}). " +
        "Nothing can be deleted through the API.\n\n" +
        "MCP: the same tools are available as a hosted MCP server at /api/v1/mcp.",
      contact: { name: "Colect", url: `${origin}/docs/api` },
    },
    servers: [{ url: origin, description: "Production" }],
    security: [{ bearerAuth: [] }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "ApiKey",
          description:
            "Personal API key issued from /settings/api-keys. Format: " +
            "`colect_pk_<prefix><secret>`. Treat as a password.",
        },
      },
      schemas: {
        Error: {
          type: "object",
          required: ["error"],
          properties: {
            error: {
              type: "object",
              required: ["code", "message"],
              properties: {
                code: { type: "string" },
                message: { type: "string" },
              },
            },
          },
        },
        Asset: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            type: { type: "string", enum: ["DECK", "CAMPAIGN", "ASSET", "VIDEO"] },
            title: { type: "string" },
            description: { type: ["string", "null"] },
            thumbnailUrl: { type: ["string", "null"] },
            region: { type: "array", items: { type: "string" } },
            persona: { type: "array", items: { type: "string" } },
            availableLanguages: { type: "array", items: { type: "string" } },
            campaignGoal: { type: ["string", "null"] },
            campaignLink: { type: ["string", "null"] },
            sentAt: { type: ["string", "null"], format: "date-time" },
            isPinned: { type: "boolean" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
            publishedAt: { type: ["string", "null"], format: "date-time" },
            visibility: {
              type: "string",
              enum: ["EVERYONE", "EMPLOYEES"],
              description: "Employee keys only. EMPLOYEES = Colect and Le New Black staff.",
            },
            brand: {
              type: ["string", "null"],
              enum: ["COLECT", "LE_NEW_BLACK", "BOTH", null],
              description: "Employee keys only. Optional internal tag.",
            },
            portalUrl: { type: "string", format: "uri" },
            detailUrl: { type: "string", format: "uri" },
          },
        },
        AssetFileInput: {
          type: "object",
          required: ["language"],
          description: "One language version. Needs fileUrl, externalLink, or both.",
          properties: {
            language: { type: "string", enum: ["EN", "DE", "FR", "NL"] },
            fileUrl: { type: "string", format: "uri", description: "`fileUrl` from POST /api/v1/uploads, after the PUT." },
            externalLink: { type: "string", format: "uri", description: "e.g. YouTube, Google Slides, Figma." },
          },
        },
        AssetWrite: {
          type: "object",
          properties: {
            type: { type: "string", enum: ["DECK", "CAMPAIGN", "ASSET", "VIDEO"] },
            title: { type: "string", maxLength: 200 },
            description: { type: ["string", "null"], maxLength: 5000 },
            visibility: {
              type: "string",
              enum: ["EVERYONE", "EMPLOYEES"],
              description: "Who can see it. EVERYONE includes partners. Required on create.",
            },
            brand: { type: ["string", "null"], enum: ["COLECT", "LE_NEW_BLACK", "BOTH", null] },
            publish: {
              type: "boolean",
              description: "true = live now. On create, omitted/false saves a draft. On edit, false unpublishes.",
            },
            files: {
              type: "array",
              minItems: 1,
              items: { $ref: "#/components/schemas/AssetFileInput" },
              description: "On edit, replaces ALL language versions.",
            },
            thumbnailUrl: {
              type: ["string", "null"],
              format: "uri",
              description: "`fileUrl` from POST /api/v1/uploads (purpose thumbnail). Resized to 800×450.",
            },
            persona: { type: "array", items: { type: "string" } },
            region: { type: "array", items: { type: "string" } },
            campaignGoal: { type: ["string", "null"] },
            campaignLink: { type: ["string", "null"], format: "uri" },
            sentAt: { type: ["string", "null"], format: "date-time" },
          },
        },
        SearchResult: {
          type: "object",
          properties: {
            type: {
              type: "string",
              enum: ["asset", "docs_update", "product_update", "team_member", "featured"],
            },
            id: { type: "string" },
            title: { type: "string" },
            snippet: { type: ["string", "null"] },
            url: { type: "string", format: "uri" },
            updatedAt: { type: "string", format: "date-time" },
            rank: { type: "number" },
          },
        },
      },
    },
    paths: {
      "/api/v1/recent": {
        get: {
          summary: "Unified 'what's new' feed across partner content",
          description:
            "Sorted-by-updatedAt union of assets, docs updates, and product " +
            "updates. The fastest way to answer 'what's changed in the portal " +
            "lately?' without making three calls and merging on the client.",
          parameters: [
            {
              name: "types",
              in: "query",
              required: false,
              description: "Comma-separated subset (default: all).",
              schema: { type: "string", example: "asset,docs_update" },
            },
            {
              name: "since",
              in: "query",
              required: false,
              description: "ISO 8601 timestamp; only items updated after it.",
              schema: { type: "string", format: "date-time" },
            },
            {
              name: "limit",
              in: "query",
              required: false,
              schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
            },
          ],
          responses: {
            "200": { description: "Recent items, newest first" },
            "401": { description: "Unauthorized" },
          },
        },
      },
      "/api/v1/me": {
        get: {
          summary: "Identify the calling user and API key",
          description: "Useful as a smoke test and to confirm key scope.",
          responses: {
            "200": { description: "OK" },
            "401": {
              description: "Unauthorized",
              content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
            },
          },
        },
      },
      "/api/v1/search": {
        get: {
          summary: "Full-text search across portal content",
          description:
            "Postgres FTS across assets, docs updates, product updates, team " +
            "members, and featured content. Results are interleaved and ranked.",
          parameters: [
            { name: "q", in: "query", required: true, schema: { type: "string", minLength: 2 } },
            {
              name: "types",
              in: "query",
              required: false,
              description: "Comma-separated subset (default: all).",
              schema: { type: "string", example: "asset,docs_update" },
            },
            {
              name: "limitPerType",
              in: "query",
              required: false,
              schema: { type: "integer", minimum: 1, maximum: 25, default: 5 },
            },
          ],
          responses: {
            "200": {
              description: "Ranked results",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      query: { type: "string" },
                      items: { type: "array", items: { $ref: "#/components/schemas/SearchResult" } },
                      total: { type: "integer" },
                    },
                  },
                },
              },
            },
            "400": { description: "Missing or invalid query" },
            "401": { description: "Unauthorized" },
          },
        },
      },
      "/api/v1/assets": {
        get: {
          summary: "List assets",
          parameters: [
            { name: "type", in: "query", schema: { type: "string", enum: ["DECK", "CAMPAIGN", "ASSET", "VIDEO"] } },
            { name: "region", in: "query", schema: { type: "string", example: "EMEA" } },
            { name: "persona", in: "query", schema: { type: "string", example: "Sales" } },
            { name: "language", in: "query", schema: { type: "string", example: "EN" } },
            { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 50 } },
            { name: "offset", in: "query", schema: { type: "integer", minimum: 0, default: 0 } },
            { name: "updatedSince", in: "query", schema: { type: "string", format: "date-time" }, description: "ISO 8601; only items updated after this." },
            { name: "visibility", in: "query", schema: { type: "string", enum: ["EVERYONE", "EMPLOYEES"] }, description: "Employee keys only; ignored otherwise." },
            { name: "brand", in: "query", schema: { type: "string", enum: ["COLECT", "LE_NEW_BLACK", "BOTH"] }, description: "Employee keys only; COLECT/LE_NEW_BLACK also match BOTH." },
            { name: "status", in: "query", schema: { type: "string", enum: ["published", "draft", "all"], default: "published" }, description: "draft/all need a write:content key." },
          ],
          responses: {
            "200": { description: "List of assets" },
            "401": { description: "Unauthorized" },
          },
        },
        post: {
          summary: "Create an asset (write:content keys)",
          description:
            "Upload any files first with POST /api/v1/uploads. `type`, `title`, " +
            "`visibility` and `files` are required. Saved as a draft unless `publish: true`.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  allOf: [
                    { $ref: "#/components/schemas/AssetWrite" },
                    { required: ["type", "title", "visibility", "files"] },
                  ],
                },
              },
            },
          },
          responses: {
            "201": { description: "Created asset (same shape as GET /api/v1/assets/{id})" },
            "400": { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            "401": { description: "Unauthorized" },
            "403": { description: "Key lacks write:content, or its owner is no longer an admin" },
          },
        },
      },
      "/api/v1/uploads": {
        post: {
          summary: "Get a URL to upload a file (write:content keys)",
          description:
            "Returns a presigned `uploadUrl` (valid 1 hour). PUT the raw bytes there with " +
            "the returned `Content-Type` header, then pass `fileUrl` to POST/PATCH /api/v1/assets.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["filename", "contentType"],
                  properties: {
                    filename: { type: "string" },
                    contentType: { type: "string", example: "application/pdf" },
                    purpose: { type: "string", enum: ["file", "thumbnail"], default: "file" },
                    assetType: { type: "string", enum: ["DECK", "CAMPAIGN", "ASSET", "VIDEO"] },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "{ uploadUrl, method, headers, fileUrl, expiresAt }" },
            "400": { description: "Validation error" },
            "403": { description: "Key lacks write:content" },
          },
        },
      },
      "/api/v1/assets/{id}": {
        get: {
          summary: "Asset detail with per-language download URLs",
          description:
            "Each download URL is presigned and short-lived — `downloadUrlExpiresAt` " +
            "(ISO 8601) is the conservative expiry. Refetch this endpoint after that " +
            "if you need to use the URL again.",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          responses: {
            "200": { description: "Asset" },
            "404": { description: "Not found" },
            "401": { description: "Unauthorized" },
          },
        },
        patch: {
          summary: "Edit an asset (write:content keys)",
          description:
            "Send only the fields to change. `files` replaces all language versions; " +
            "`publish` true/false publishes or unpublishes. Deleting is not possible via the API.",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          requestBody: {
            required: true,
            content: { "application/json": { schema: { $ref: "#/components/schemas/AssetWrite" } } },
          },
          responses: {
            "200": { description: "Updated asset" },
            "400": { description: "Validation error" },
            "403": { description: "Key lacks write:content" },
            "404": { description: "Not found" },
          },
        },
      },
      "/api/v1/docs-updates": {
        get: {
          summary: "List documentation updates",
          parameters: [
            { name: "category", in: "query", schema: { type: "string" } },
            { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 50 } },
            { name: "offset", in: "query", schema: { type: "integer", minimum: 0, default: 0 } },
            { name: "updatedSince", in: "query", schema: { type: "string", format: "date-time" }, description: "ISO 8601; only items updated after this." },
          ],
          responses: { "200": { description: "List" }, "401": { description: "Unauthorized" } },
        },
      },
      "/api/v1/product-updates": {
        get: {
          summary: "List product updates",
          parameters: [
            { name: "updateType", in: "query", schema: { type: "string", enum: ["release_note", "coming_up"] } },
            { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 50 } },
            { name: "offset", in: "query", schema: { type: "integer", minimum: 0, default: 0 } },
            { name: "updatedSince", in: "query", schema: { type: "string", format: "date-time" }, description: "ISO 8601; only items updated after this." },
          ],
          responses: { "200": { description: "List" }, "401": { description: "Unauthorized" } },
        },
      },
      "/api/v1/who-is-who": {
        get: {
          summary: "List team members (Who's Who)",
          parameters: [
            { name: "department", in: "query", schema: { type: "string" } },
            { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 50 } },
            { name: "offset", in: "query", schema: { type: "integer", minimum: 0, default: 0 } },
            { name: "updatedSince", in: "query", schema: { type: "string", format: "date-time" }, description: "ISO 8601; only items updated after this." },
          ],
          responses: { "200": { description: "List" }, "401": { description: "Unauthorized" } },
        },
      },
      "/api/v1/featured": {
        get: {
          summary: "List currently active featured items",
          description: "Only returns items where startDate <= now and (endDate is null or > now).",
          responses: { "200": { description: "List" }, "401": { description: "Unauthorized" } },
        },
      },
    },
  } as const
}
