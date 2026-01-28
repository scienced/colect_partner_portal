import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/supertokens/session"
import { uploadThumbnail } from "@/lib/s3"
import sharp from "sharp"

// Thumbnail settings
const THUMBNAIL_WIDTH = 800
const THUMBNAIL_HEIGHT = 450  // 16:9 aspect ratio
const THUMBNAIL_QUALITY = 75

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "File must be an image" },
        { status: 400 }
      )
    }

    // Validate file size (max 10MB for original)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size exceeds 10MB limit" },
        { status: 400 }
      )
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Process image with sharp - resize and optimize
    const sharpInstance = sharp(buffer).resize(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT, {
      withoutEnlargement: true,
      fit: "cover",
      position: "centre",
    })

    // Generate thumbnail and blur placeholder in parallel
    const [processedBuffer, blurBuffer] = await Promise.all([
      sharpInstance.clone().jpeg({ quality: THUMBNAIL_QUALITY, progressive: true }).toBuffer(),
      sharpInstance.clone().resize(10, 6).jpeg({ quality: 40 }).toBuffer(),
    ])

    const blurDataUrl = `data:image/jpeg;base64,${blurBuffer.toString("base64")}`

    // Generate filename
    const timestamp = Date.now()
    const originalName = file.name.replace(/\.[^.]+$/, "") // Remove extension
    const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, "_")
    const filename = `${timestamp}-${sanitizedName}.jpg`

    // Upload to S3
    const thumbnailUrl = await uploadThumbnail(processedBuffer, filename)

    return NextResponse.json({
      thumbnailUrl,
      blurDataUrl,
      originalSize: file.size,
      thumbnailSize: processedBuffer.length,
    })
  } catch (error) {
    console.error("Thumbnail processing error:", error)
    return NextResponse.json(
      { error: "Failed to process thumbnail" },
      { status: 500 }
    )
  }
}
