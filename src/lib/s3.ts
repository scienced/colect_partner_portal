import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
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

// Optional S3-compatible endpoint (e.g. a local RustFS/MinIO container at
// http://localhost:9000) so local development never writes to the real
// bucket. Unset in production → plain AWS S3 with virtual-hosted URLs.
const S3_ENDPOINT = process.env.S3_ENDPOINT?.replace(/\/$/, "") || null

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "eu-west-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
  ...(S3_ENDPOINT ? { endpoint: S3_ENDPOINT, forcePathStyle: true } : {}),
})

const BUCKET_NAME = process.env.S3_BUCKET_NAME || ""
const AWS_REGION = process.env.AWS_REGION || "eu-west-1"

/** Canonical (unsigned) URL for a key in our bucket. */
export function bucketUrlForKey(key: string): string {
  return S3_ENDPOINT
    ? `${S3_ENDPOINT}/${BUCKET_NAME}/${key}`
    : `https://${BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${key}`
}

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
  const fileUrl = bucketUrlForKey(key)

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
  const ours = ourBucketKeyFromUrl(url)
  if (ours) return ours
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
  if (ourBucketKeyFromUrl(url)) return true
  return url.includes(".s3.") && url.includes("amazonaws.com")
}

/**
 * Check if a key is for a public thumbnail
 * Thumbnails are stored in the thumbnails/ folder and are publicly accessible
 */
function isPublicThumbnail(key: string): boolean {
  return key.startsWith("thumbnails/")
}

/**
 * Generate presigned URL for a file if it's an S3 URL, otherwise return as-is
 * Thumbnails are public and don't need presigning
 */
export async function getPresignedUrlIfNeeded(url: string | null | undefined): Promise<string | null> {
  if (!url) return null
  if (!isS3Url(url)) return url

  const key = getKeyFromUrl(url)
  if (!key) return url

  // Thumbnails are public - return direct URL without presigning
  if (isPublicThumbnail(key)) {
    return url
  }

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

  return bucketUrlForKey(key)
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

  return bucketUrlForKey(key)
}

/**
 * Get the public URL for a campaign MHTML file
 * Used for Screenshotbase API to access the file for screenshotting
 */
export function getCampaignPublicUrl(key: string): string {
  return bucketUrlForKey(key)
}

/**
 * If `url` points at an object in OUR bucket, return its key; otherwise null.
 * Accepts virtual-hosted (`bucket.s3.region.amazonaws.com/key`) and
 * path-style (`s3.region.amazonaws.com/bucket/key`) URLs, with or without a
 * presign query string. Used to validate URLs an API client hands back to us.
 */
export function ourBucketKeyFromUrl(url: string): string | null {
  if (!BUCKET_NAME) return null
  if (S3_ENDPOINT) {
    const prefix = `${S3_ENDPOINT}/${BUCKET_NAME}/`
    if (!url.startsWith(prefix)) return null
    const key = decodeURIComponent(url.slice(prefix.length).split("?")[0])
    return key || null
  }
  try {
    const u = new URL(url)
    if (u.protocol !== "https:") return null
    const virtualHosts = [`${BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com`, `${BUCKET_NAME}.s3.amazonaws.com`]
    const pathHosts = [`s3.${AWS_REGION}.amazonaws.com`, "s3.amazonaws.com"]
    const path = decodeURIComponent(u.pathname.replace(/^\//, ""))
    if (virtualHosts.includes(u.hostname)) return path || null
    if (pathHosts.includes(u.hostname)) {
      const [bucket, ...rest] = path.split("/")
      return bucket === BUCKET_NAME && rest.length ? rest.join("/") : null
    }
    return null
  } catch {
    return null
  }
}

/** Size + type of an object, or null if it doesn't exist. */
export async function headObject(
  key: string
): Promise<{ contentLength: number | null; contentType: string | null } | null> {
  try {
    const res = await s3Client.send(new HeadObjectCommand({ Bucket: BUCKET_NAME, Key: key }))
    return { contentLength: res.ContentLength ?? null, contentType: res.ContentType ?? null }
  } catch (e) {
    const status = (e as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode
    if (status === 404 || status === 403) return null
    throw e
  }
}

/** Download an object into memory. Only for small files (thumbnails). */
export async function getObjectBuffer(key: string): Promise<Buffer> {
  const res = await s3Client.send(new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key }))
  if (!res.Body) throw new Error(`Empty S3 object: ${key}`)
  return Buffer.from(await res.Body.transformToByteArray())
}
