import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAdmin } from "@/lib/supertokens/session"
import { getPresignedUploadUrl } from "@/lib/s3"

const uploadRequestSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().min(1),
  folder: z.enum(["assets", "thumbnails", "team-photos"]).optional(),
})

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const data = uploadRequestSchema.parse(body)

    const presignedUrl = await getPresignedUploadUrl(
      data.filename,
      data.contentType,
      data.folder || "assets"
    )

    return NextResponse.json(presignedUrl)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.errors },
        { status: 400 }
      )
    }
    console.error("Upload presign error:", error)
    return NextResponse.json(
      { error: "Failed to generate upload URL" },
      { status: 500 }
    )
  }
}
