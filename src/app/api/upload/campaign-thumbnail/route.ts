import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAdmin } from "@/lib/supertokens/session"
import { uploadThumbnail, getKeyFromUrl, getPresignedDownloadUrl, isS3Url } from "@/lib/s3"
import { captureScreenshot, downloadScreenshot } from "@/lib/captureapi"
import sharp from "sharp"

// Thumbnail settings
const THUMBNAIL_WIDTH = 400
const THUMBNAIL_QUALITY = 80

const BUCKET_NAME = process.env.S3_BUCKET_NAME || ""
const AWS_REGION = process.env.AWS_REGION || "eu-west-1"

const requestSchema = z.object({
  htmlUrl: z.string().url(),
})

/**
 * Validate that a URL belongs to our S3 bucket to prevent SSRF attacks.
 * Only URLs from our own S3 bucket are allowed.
 */
function isValidS3UrlFromOurBucket(url: string): boolean {
  if (!BUCKET_NAME) return false

  try {
    const urlObj = new URL(url)

    // Must be HTTPS
    if (urlObj.protocol !== "https:") return false

    // Allowed S3 hostnames for our bucket
    const allowedHostnames = [
      `${BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com`,
      `${BUCKET_NAME}.s3.amazonaws.com`,
    ]

    // For path-style URLs (s3.region.amazonaws.com/bucket)
    if (urlObj.hostname === `s3.${AWS_REGION}.amazonaws.com` ||
        urlObj.hostname === "s3.amazonaws.com") {
      // Verify bucket name is the first path segment
      const segments = urlObj.pathname.split("/").filter(Boolean)
      return segments.length >= 1 && segments[0] === BUCKET_NAME
    }

    return allowedHostnames.includes(urlObj.hostname)
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { htmlUrl } = requestSchema.parse(body)

    // SECURITY: Only allow S3 URLs from our bucket to prevent SSRF attacks
    if (!isS3Url(htmlUrl) || !isValidS3UrlFromOurBucket(htmlUrl)) {
      return NextResponse.json(
        { error: "Only S3 URLs from the configured bucket are allowed" },
        { status: 400 }
      )
    }

    // Get a presigned URL so Screenshotbase can access the file
    const key = getKeyFromUrl(htmlUrl)
    if (!key) {
      return NextResponse.json({ error: "Invalid S3 URL format" }, { status: 400 })
    }
    const screenshotUrl = await getPresignedDownloadUrl(key)

    // Capture screenshot using Screenshotbase with the presigned URL
    const screenshotResult = await captureScreenshot({
      url: screenshotUrl,
      width: 1200,
      height: 900,
      format: "png",
      fullPage: false,
    })

    // Step 2: Download the screenshot
    const screenshotBuffer = await downloadScreenshot(screenshotResult.screenshotUrl)

    // Step 3: Process with sharp - resize and optimize
    const processedBuffer = await sharp(screenshotBuffer)
      .resize(THUMBNAIL_WIDTH, null, {
        withoutEnlargement: true,
        fit: "inside",
      })
      .jpeg({ quality: THUMBNAIL_QUALITY, progressive: true })
      .toBuffer()

    // Step 4: Generate filename and upload to S3
    const timestamp = Date.now()
    const filename = `${timestamp}-campaign-thumbnail.jpg`
    const thumbnailUrl = await uploadThumbnail(processedBuffer, filename)

    return NextResponse.json({
      thumbnailUrl,
      success: true,
      originalSize: screenshotBuffer.length,
      thumbnailSize: processedBuffer.length,
    })
  } catch (error) {
    console.error("Campaign thumbnail generation error:", error)

    const errorMessage = error instanceof Error ? error.message : "Unknown error"

    return NextResponse.json(
      {
        error: "Failed to generate campaign thumbnail",
        details: errorMessage,
      },
      { status: 500 }
    )
  }
}
