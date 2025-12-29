"use client"

import { useState, useRef, useCallback } from "react"
import { Upload, X, FileIcon, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/Button"

interface FileUploaderProps {
  onUploadComplete: (fileUrl: string) => void
  folder?: "assets" | "thumbnails" | "team-photos" | "videos" | "campaigns"
  accept?: string
  maxSizeMB?: number
  currentUrl?: string
  label?: string
}

export function FileUploader({
  onUploadComplete,
  folder = "assets",
  accept = "*/*",
  maxSizeMB = 50,
  currentUrl,
  label = "Upload file",
}: FileUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const uploadFile = useCallback(
    async (file: File) => {
      setError(null)
      setProgress(0)

      // Validate file size
      if (file.size > maxSizeMB * 1024 * 1024) {
        setError(`File size exceeds ${maxSizeMB}MB limit`)
        return
      }

      setUploading(true)

      try {
        // For thumbnails, use server-side processing to generate optimized images
        if (folder === "thumbnails" && file.type.startsWith("image/")) {
          const formData = new FormData()
          formData.append("file", file)

          const response = await fetch("/api/upload/thumbnail", {
            method: "POST",
            body: formData,
          })

          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || "Failed to upload thumbnail")
          }

          const { thumbnailUrl, originalSize, thumbnailSize } = await response.json()

          // Log compression results
          const compressionRatio = ((1 - thumbnailSize / originalSize) * 100).toFixed(1)
          console.log(`Thumbnail optimized: ${(originalSize / 1024).toFixed(0)}KB → ${(thumbnailSize / 1024).toFixed(0)}KB (${compressionRatio}% smaller)`)

          onUploadComplete(thumbnailUrl)
          return
        }

        // For other files, use presigned URL flow
        const presignResponse = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type,
            folder,
          }),
        })

        if (!presignResponse.ok) {
          throw new Error("Failed to get upload URL")
        }

        const { uploadUrl, fileUrl } = await presignResponse.json()

        // Upload to S3 with progress tracking
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest()

          xhr.upload.addEventListener("progress", (event) => {
            if (event.lengthComputable) {
              setProgress(Math.round((event.loaded / event.total) * 100))
            }
          })

          xhr.addEventListener("load", () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve()
            } else {
              reject(new Error(`Upload failed with status ${xhr.status}`))
            }
          })

          xhr.addEventListener("error", () => {
            reject(new Error("Upload failed"))
          })

          xhr.open("PUT", uploadUrl)
          xhr.setRequestHeader("Content-Type", file.type)
          xhr.send(file)
        })

        onUploadComplete(fileUrl)
      } catch (err) {
        console.error("Upload error:", err)
        setError(err instanceof Error ? err.message : "Upload failed")
      } finally {
        setUploading(false)
        setProgress(0)
      }
    },
    [folder, maxSizeMB, onUploadComplete]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)

      const file = e.dataTransfer.files[0]
      if (file) {
        uploadFile(file)
      }
    },
    [uploadFile]
  )

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        uploadFile(file)
      }
    },
    [uploadFile]
  )

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>

      {currentUrl ? (
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <FileIcon className="w-5 h-5 text-gray-400" />
          <a
            href={currentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-sm text-primary hover:underline truncate"
          >
            {currentUrl.split("/").pop()}
          </a>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onUploadComplete("")}
            className="text-gray-400 hover:text-red-500"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <div
          className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            dragOver
              ? "border-primary bg-primary/5"
              : "border-gray-300 hover:border-gray-400"
          }`}
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <span className="text-sm text-gray-600">
                Uploading... {progress}%
              </span>
              <div className="w-48 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : (
            <>
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">
                Drag and drop or{" "}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-primary hover:underline font-medium"
                >
                  browse
                </button>
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Max {maxSizeMB}MB
              </p>
            </>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      )}

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  )
}
