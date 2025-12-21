import { NextRequest, NextResponse } from "next/server"
import { getAppDirRequestHandler } from "supertokens-node/nextjs"
import { initSupertokens } from "@/lib/supertokens/backend"

initSupertokens()

const handleCall = getAppDirRequestHandler(NextResponse)

export async function GET(request: NextRequest) {
  const res = await handleCall(request)
  if (!res.headers.get("content-type")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  return res
}

export async function POST(request: NextRequest) {
  return handleCall(request)
}

export async function DELETE(request: NextRequest) {
  return handleCall(request)
}

export async function PUT(request: NextRequest) {
  return handleCall(request)
}
