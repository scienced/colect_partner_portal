import sharp from "sharp"
import { uploadThumbnail } from "@/lib/s3"

// Thumbnail settings
const THUMBNAIL_WIDTH = 800
const THUMBNAIL_HEIGHT = 450 // 16:9 aspect ratio
const THUMBNAIL_QUALITY = 75

/**
 * Resize an uploaded image into a portal thumbnail (800×450 JPEG) plus a tiny
 * blur placeholder, and store it under the public thumbnails/ prefix. Shared
 * by the admin uploader and the agent API.
 */
export async function processAndUploadThumbnail(
  buffer: Buffer,
  originalName: string
): Promise<{ thumbnailUrl: string; blurDataUrl: string; thumbnailSize: number }> {
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

  const baseName = originalName.replace(/\.[^.]+$/, "") // Remove extension
  const sanitizedName = baseName.replace(/[^a-zA-Z0-9.-]/g, "_")
  const filename = `${Date.now()}-${sanitizedName}.jpg`

  const thumbnailUrl = await uploadThumbnail(processedBuffer, filename)
  return { thumbnailUrl, blurDataUrl, thumbnailSize: processedBuffer.length }
}
