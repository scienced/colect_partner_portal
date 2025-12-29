import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

// In-memory cache for presigned URLs
// URLs are valid for 1 hour, so cache for 45 minutes to be safe
const PRESIGNED_URL_CACHE_TTL = 45 * 60 * 1000 // 45 minutes in ms
const presignedUrlCache = new Map<string, { url: string; expiresAt: number }>()

// Clean up expired entries periodically
function cleanupCache() {
  const now = Date.now()
  presignedUrlCache.forEach((value, key) => {
    if (value.expiresAt < now) {
      presignedUrlCache.delete(key)
    }
  })
}

// Run cleanup every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(cleanupCache, 5 * 60 * 1000)
}

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "eu-west-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
})

const BUCKET_NAME = process.env.S3_BUCKET_NAME || ""
const AWS_REGION = process.env.AWS_REGION || "eu-west-1"

export interface PresignedUploadUrl {
  uploadUrl: string
  fileUrl: string
  key: string
}

/**
 * Generate a presigned URL for uploading a file to S3
 */
export async function getPresignedUploadUrl(
  filename: string,
  contentType: string,
  folder: string = "assets"
): Promise<PresignedUploadUrl> {
  // Generate unique key with timestamp to avoid collisions
  const timestamp = Date.now()
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_")
  const key = `${folder}/${timestamp}-${sanitizedFilename}`

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  })

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 })
  const fileUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || "eu-west-1"}.amazonaws.com/${key}`

  return {
    uploadUrl,
    fileUrl,
    key,
  }
}

/**
 * Generate a presigned URL for downloading/viewing a file
 * Uses in-memory caching to avoid regenerating URLs on every request
 */
export async function getPresignedDownloadUrl(key: string): Promise<string> {
  // Check cache first
  const cached = presignedUrlCache.get(key)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.url
  }

  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  })

  const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 })

  // Cache the URL
  presignedUrlCache.set(key, {
    url,
    expiresAt: Date.now() + PRESIGNED_URL_CACHE_TTL,
  })

  return url
}

/**
 * Delete a file from S3
 */
export async function deleteFile(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  })

  await s3Client.send(command)
}

/**
 * Extract the S3 key from a full S3 URL
 */
export function getKeyFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url)
    // Remove leading slash from pathname
    return urlObj.pathname.slice(1)
  } catch {
    return null
  }
}

/**
 * Check if a URL is an S3 URL from our bucket
 */
export function isS3Url(url: string | null | undefined): boolean {
  if (!url) return false
  return url.includes(".s3.") && url.includes("amazonaws.com")
}

/**
 * Generate presigned URL for a file if it's an S3 URL, otherwise return as-is
 */
export async function getPresignedUrlIfNeeded(url: string | null | undefined): Promise<string | null> {
  if (!url) return null
  if (!isS3Url(url)) return url

  const key = getKeyFromUrl(url)
  if (!key) return url

  return getPresignedDownloadUrl(key)
}

/**
 * Generate presigned URLs for multiple S3 URLs in parallel
 */
export async function getPresignedUrls(urls: (string | null | undefined)[]): Promise<(string | null)[]> {
  return Promise.all(urls.map(url => getPresignedUrlIfNeeded(url)))
}

/**
 * Upload a processed thumbnail buffer directly to S3
 */
export async function uploadThumbnail(buffer: Buffer, filename: string): Promise<string> {
  const key = `thumbnails/${filename}`

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: "image/jpeg",
  })

  await s3Client.send(command)

  return `https://${BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${key}`
}

/**
 * Upload any buffer to S3 with specified content type
 */
export async function uploadBuffer(
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  })

  await s3Client.send(command)

  return `https://${BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${key}`
}

/**
 * Get the public URL for a campaign MHTML file
 * Used for captureapi.net to access the file for screenshotting
 */
export function getCampaignPublicUrl(key: string): string {
  return `https://${BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${key}`
}
