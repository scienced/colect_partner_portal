import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/supertokens/session"
import { getPresignedDownloadUrl } from "@/lib/s3"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const url = searchParams.get("url")

    if (!url) {
      return NextResponse.json({ error: "URL parameter required" }, { status: 400 })
    }

    // Extract the S3 key from the URL
    const key = getKeyFromS3Url(url)
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

function getKeyFromS3Url(url: string): string | null {
  try {
    const urlObj = new URL(url)
    // Handle both path-style and virtual-hosted-style URLs
    // https://bucket-name.s3.region.amazonaws.com/key
    // https://s3.region.amazonaws.com/bucket-name/key
    const pathname = urlObj.pathname
    // Remove leading slash
    return pathname.startsWith("/") ? pathname.slice(1) : pathname
  } catch {
    return null
  }
}
