import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/supertokens/session"
import { prisma } from "@/lib/prisma"
import { getPresignedUrlIfNeeded } from "@/lib/s3"
import { canonicalLanguage } from "@/lib/assetVariants"

/**
 * Presign a specific language variant's file URL on demand.
 *
 * Used by the portal drawer's language toggle: when a partner switches
 * from EN to FR, we fetch /api/portal/assets/{id}/variant?language=FR
 * and swap the Download button's href. This keeps list-endpoint presign
 * cost O(assets) instead of O(assets × languages).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const languageParam = searchParams.get("language")
    if (!languageParam) {
      return NextResponse.json(
        { error: "language query parameter is required" },
        { status: 400 }
      )
    }
    const language = canonicalLanguage(languageParam)

    // Authorization: only return variants of PUBLISHED assets. Partners must
    // not be able to fetch drafts by guessing an asset id.
    const asset = await prisma.asset.findUnique({
      where: { id },
      select: { publishedAt: true },
    })
    if (!asset || !asset.publishedAt) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const variant = await prisma.assetVariant.findUnique({
      where: { assetId_language: { assetId: id, language } },
      select: {
        id: true,
        language: true,
        fileUrl: true,
        fileType: true,
        fileSize: true,
        externalLink: true,
        displayOrder: true,
      },
    })

    if (!variant) {
      return NextResponse.json(
        { error: "Variant not found for the given asset + language" },
        { status: 404 }
      )
    }

    // Only the file needs presigning — external links go out as-is.
    const presignedFileUrl = await getPresignedUrlIfNeeded(variant.fileUrl)

    return NextResponse.json({
      ...variant,
      fileUrl: presignedFileUrl,
    })
  } catch (error) {
    console.error("Variant presign error:", error)
    return NextResponse.json(
      { error: "Failed to presign variant" },
      { status: 500 }
    )
  }
}
