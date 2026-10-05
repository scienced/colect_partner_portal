import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/supertokens/session"
import { processAndUploadThumbnail } from "@/lib/thumbnails"

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

    const buffer = Buffer.from(await file.arrayBuffer())
    const { thumbnailUrl, blurDataUrl, thumbnailSize } = await processAndUploadThumbnail(buffer, file.name)

    return NextResponse.json({
      thumbnailUrl,
      blurDataUrl,
      originalSize: file.size,
      thumbnailSize,
    })
  } catch (error) {
    console.error("Thumbnail processing error:", error)
    return NextResponse.json(
      { error: "Failed to process thumbnail" },
      { status: 500 }
    )
  }
}
