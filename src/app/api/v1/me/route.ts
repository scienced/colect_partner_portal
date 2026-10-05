import { NextRequest } from "next/server"
import { requireApiKey, isAuthResponse, SCOPE_WRITE } from "@/lib/v1Auth"
import { ok, withV1Handler } from "@/lib/v1Response"
import { maskKeyForDisplay } from "@/lib/apiKeys"

export const dynamic = "force-dynamic"

export const GET = withV1Handler(async (request: NextRequest) => {
  const auth = await requireApiKey(request)
  if (isAuthResponse(auth)) return auth
  const { user, apiKey, viewer, source } = auth

  return ok({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      domain: apiKey.domain,
      // "employee" = Colect / Le New Black staff (sees employee-only content
      // and the internal brand tag); "partner" = everyone else.
      audience: viewer.isEmployee ? "employee" : "partner",
    },
    // True when this key can call the create/edit content endpoints.
    canWriteContent: apiKey.scopes.includes(SCOPE_WRITE) && user.role === "ADMIN",
    apiKey: {
      id: apiKey.id,
      label: apiKey.label,
      prefix: apiKey.prefix,
      display: maskKeyForDisplay(apiKey.prefix),
      scopes: apiKey.scopes,
      createdAt: apiKey.createdAt.toISOString(),
      expiresAt: apiKey.expiresAt?.toISOString() ?? null,
      lastUsedAt: apiKey.lastUsedAt?.toISOString() ?? null,
    },
    // "MCP_QUERY" if the call rode the MCP server (x-colect-source: mcp),
    // "API_QUERY" otherwise. Echoed so MCP clients can confirm their headers
    // are reaching us.
    callSource: source,
  })
})
