import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAdmin } from "@/lib/supertokens/session"
import { uploadThumbnail, getKeyFromUrl, getPresignedDownloadUrl, isS3Url } from "@/lib/s3"
import { captureScreenshot, downloadScreenshot } from "@/lib/captureapi"
import sharp from "sharp"

// Thumbnail settings
const THUMBNAIL_WIDTH = 400
const THUMBNAIL_QUALITY = 80

const requestSchema = z.object({
  htmlUrl: z.string().url(),
})

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { htmlUrl } = requestSchema.parse(body)

    // Get a presigned URL if it's an S3 URL (so captureapi.net can access it)
    let screenshotUrl = htmlUrl
    if (isS3Url(htmlUrl)) {
      const key = getKeyFromUrl(htmlUrl)
      if (key) {
        screenshotUrl = await getPresignedDownloadUrl(key)
      }
    }

    // Capture screenshot using captureapi.net with the presigned URL
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
