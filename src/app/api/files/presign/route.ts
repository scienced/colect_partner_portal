import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/supertokens/session"
import { getPresignedDownloadUrl } from "@/lib/s3"

const BUCKET_NAME = process.env.S3_BUCKET_NAME || ""
const AWS_REGION = process.env.AWS_REGION || "eu-west-1"

// Allowed S3 hostnames for our bucket
function getAllowedS3Hostnames(): string[] {
  if (!BUCKET_NAME) return []
  return [
    `${BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com`,
    `${BUCKET_NAME}.s3.amazonaws.com`,
    `s3.${AWS_REGION}.amazonaws.com`,
    `s3.amazonaws.com`,
  ]
}

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

    // Extract and validate the S3 key from the URL
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
    const allowedHostnames = getAllowedS3Hostnames()

    // Validate the hostname belongs to our S3 bucket
    if (!allowedHostnames.includes(urlObj.hostname)) {
      return null
    }

    // Handle both path-style and virtual-hosted-style URLs
    // Virtual-hosted: https://bucket-name.s3.region.amazonaws.com/key
    // Path-style: https://s3.region.amazonaws.com/bucket-name/key
    const pathname = urlObj.pathname

    // For path-style URLs, verify the bucket name is in the path
    if (urlObj.hostname.startsWith("s3.") && !urlObj.hostname.includes(BUCKET_NAME)) {
      // Path-style URL: first segment should be bucket name
      const segments = pathname.split("/").filter(Boolean)
      if (segments.length < 2 || segments[0] !== BUCKET_NAME) {
        return null
      }
      // Return the key (everything after bucket name)
      return segments.slice(1).join("/")
    }

    // Virtual-hosted style: pathname is the key
    return pathname.startsWith("/") ? pathname.slice(1) : pathname
  } catch {
    return null
  }
}
