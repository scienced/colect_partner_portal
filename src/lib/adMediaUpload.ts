"use client"

import JSZip from "jszip"

/**
 * Browser-side helpers for the ad set form: unpack zips and upload visuals
 * straight to storage with a presigned PUT (same flow as FileUploader).
 * Zips are unpacked here so the server never has to handle large archives.
 */

const MEDIA_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  pdf: "application/pdf",
}

export const AD_MEDIA_ACCEPT = ".png,.jpg,.jpeg,.gif,.webp,.svg,.mp4,.mov,.webm,.pdf,.zip"
export const MAX_AD_FILE_MB = 200

function mediaType(name: string): string | null {
  return MEDIA_TYPES[name.split(".").pop()?.toLowerCase() ?? ""] ?? null
}

/**
 * Expand dropped/selected files: zips become their media entries (macOS
 * metadata and hidden files skipped, sorted by path so "01-…, 02-…" keep
 * their order); anything that isn't an image/video/PDF is reported back.
 */
export async function expandFiles(files: File[]): Promise<{ media: File[]; skipped: string[] }> {
  const media: File[] = []
  const skipped: string[] = []
  for (const file of files) {
    if (file.name.toLowerCase().endsWith(".zip")) {
      const zip = await JSZip.loadAsync(file)
      const entries = Object.values(zip.files)
        .filter((e) => !e.dir && !e.name.startsWith("__MACOSX/") && !e.name.split("/").pop()!.startsWith("."))
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
      for (const entry of entries) {
        const name = entry.name.split("/").pop()!
        const type = mediaType(name)
        if (!type) {
          skipped.push(name)
          continue
        }
        media.push(new File([await entry.async("blob")], name, { type }))
      }
      continue
    }
    const type = file.type || mediaType(file.name)
    if (!type || !(type.startsWith("image/") || type.startsWith("video/") || type === "application/pdf")) {
      skipped.push(file.name)
      continue
    }
    media.push(file.type ? file : new File([file], file.name, { type }))
  }
  return { media, skipped }
}

/** Upload one visual; resolves to the raw storage URL to save on the ad set. */
export async function uploadAdMedia(file: File): Promise<string> {
  if (file.size > MAX_AD_FILE_MB * 1024 * 1024) {
    throw new Error(`${file.name} is larger than ${MAX_AD_FILE_MB}MB`)
  }
  const presign = await fetch("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename: file.name, contentType: file.type, folder: "social-ads" }),
  })
  if (!presign.ok) throw new Error("Couldn't get an upload URL")
  const { uploadUrl, fileUrl } = await presign.json()

  const put = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file })
  if (!put.ok) throw new Error(`Upload failed for ${file.name}`)
  return fileUrl
}
