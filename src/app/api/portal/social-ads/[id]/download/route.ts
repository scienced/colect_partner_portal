import { NextRequest, NextResponse } from "next/server"
import JSZip from "jszip"
import { getSessionViewer } from "@/lib/supertokens/session"
import { findAdSets } from "@/lib/adSets"
import { getObjectBuffer, ourBucketKeyFromUrl } from "@/lib/s3"
import { trackAssetDownload } from "@/lib/analytics"

export const dynamic = "force-dynamic"

// Ad visuals are images/short videos; cap the zip so one request can't pull
// an unbounded amount into memory.
const MAX_ZIP_BYTES = 200 * 1024 * 1024

/** GET: every visual of one ad set as a zip, plus the copy as copy.txt. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getSessionViewer()
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const { rows } = await findAdSets(auth.viewer, { id, includeDrafts: auth.viewer.isAdmin })
    const adSet = rows[0]
    if (!adSet) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const total = adSet.media.reduce((sum, m) => sum + (m.fileSize ?? 0), 0)
    if (total > MAX_ZIP_BYTES) {
      return NextResponse.json({ error: "Too large to zip — download the visuals one by one." }, { status: 413 })
    }

    const zip = new JSZip()
    const used = new Set<string>()
    await Promise.all(
      adSet.media.map(async (m, i) => {
        const key = ourBucketKeyFromUrl(m.fileUrl)
        if (!key) return
        // Prefix with the position so the zip keeps the carousel order.
        let name = `${String(i + 1).padStart(2, "0")}-${m.fileName || key.split("/").pop()}`
        while (used.has(name)) name = `x-${name}`
        used.add(name)
        zip.file(name, await getObjectBuffer(key))
      })
    )
    if (adSet.adCopies.length) {
      const text = adSet.adCopies
        .map((c, i) =>
          [
            `## ${c.label || `Copy ${i + 1}`}${c.language ? ` (${c.language})` : ""}`,
            `Intro text:\n${c.introText}`,
            c.headline && `Headline: ${c.headline}`,
            c.description && `Description: ${c.description}`,
            c.ctaLabel && `Call to action: ${c.ctaLabel}`,
            c.destinationUrl && `Link: ${c.destinationUrl}`,
          ]
            .filter(Boolean)
            .join("\n\n")
        )
        .join("\n\n---\n\n")
      zip.file("copy.txt", text)
    }

    const buffer = await zip.generateAsync({ type: "nodebuffer" })
    if (auth.session.user) {
      trackAssetDownload(auth.session.user.id, auth.session.user.email, adSet.id, adSet.title, "SOCIAL_AD").catch(
        console.error
      )
    }
    const filename = adSet.title.replace(/[^a-zA-Z0-9-_ ]/g, "").trim().replace(/\s+/g, "-") || "ad-set"
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}.zip"`,
        "Cache-Control": "private, no-store",
      },
    })
  } catch (error) {
    console.error("Ad set zip error:", error)
    return NextResponse.json({ error: "Failed to build zip" }, { status: 500 })
  }
}
