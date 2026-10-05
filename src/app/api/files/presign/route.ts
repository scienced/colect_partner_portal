import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/supertokens/session"
import { getPresignedDownloadUrl, ourBucketKeyFromUrl } from "@/lib/s3"

export async function GET(request: NextRequest) {
  try {
    // Admin only. This signs ANY key in the bucket, so it can't be open to
    // partners once employee-only files exist. Portal downloads go through
    // the asset routes, which check visibility per asset.
    try {
      await requireAdmin()
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const url = searchParams.get("url")

    if (!url) {
      return NextResponse.json({ error: "URL parameter required" }, { status: 400 })
    }

    // Extract and validate the S3 key from the URL
    const key = ourBucketKeyFromUrl(url)
    if (!key) {
      return NextResponse.json({ error: "Invalid S3 URL" }, { status: 400 })
    }

    const presignedUrl = await getPresignedDownloadUrl(key)
    return NextResponse.json({ presignedUrl })
  } catch (error) {
    console.error("Presign error:", error)
    return NextResponse.json({ error: "Failed to generate presigned URL" }, { status: 500 })
  }
}
