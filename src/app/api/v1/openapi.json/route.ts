import { NextRequest, NextResponse } from "next/server"
import { buildOpenApiSpec } from "@/lib/openapi"
import { getCanonicalOrigin } from "@/lib/v1Response"

export const dynamic = "force-dynamic"

/**
 * Public OpenAPI 3.1 spec. No auth required — the spec is just a description
 * of the API surface; using the API still requires a key. Agents can ingest
 * this URL directly as a tool catalog.
 */
export async function GET(request: NextRequest) {
  const origin = getCanonicalOrigin(request)
  return NextResponse.json(buildOpenApiSpec(origin), {
    headers: {
      "Cache-Control": "public, max-age=300, s-maxage=300",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
    },
  })
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  })
}
