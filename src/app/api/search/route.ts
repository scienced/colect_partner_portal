import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/supertokens/session"

export async function GET(request: NextRequest) {
  try {
    // Check session but don't require it strictly - portal layout already handles auth
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ results: [], error: "Not authenticated" })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q")?.trim()

    if (!query || query.length < 2) {
      return NextResponse.json({ results: [] })
    }

    const searchTerm = `%${query}%`

    // Search across multiple tables in parallel
    const [assets, docsUpdates, productUpdates, teamMembers] = await Promise.all([
      prisma.asset.findMany({
        where: {
          AND: [
            { publishedAt: { not: null } },
            {
              OR: [
                { title: { contains: query, mode: "insensitive" } },
                { description: { contains: query, mode: "insensitive" } },
              ],
            },
          ],
        },
        take: 5,
        select: {
          id: true,
          title: true,
          type: true,
          description: true,
        },
      }),
      prisma.docsUpdate.findMany({
        where: {
          AND: [
            { publishedAt: { not: null } },
            {
              OR: [
                { title: { contains: query, mode: "insensitive" } },
                { summary: { contains: query, mode: "insensitive" } },
              ],
            },
          ],
        },
        take: 5,
        select: {
          id: true,
          title: true,
          summary: true,
          deepLink: true,
        },
      }),
      prisma.productUpdate.findMany({
        where: {
          AND: [
            { publishedAt: { not: null } },
            {
              OR: [
                { title: { contains: query, mode: "insensitive" } },
                { content: { contains: query, mode: "insensitive" } },
              ],
            },
          ],
        },
        take: 5,
        select: {
          id: true,
          title: true,
          updateType: true,
          content: true,
        },
      }),
      prisma.teamMember.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { role: { contains: query, mode: "insensitive" } },
            { department: { contains: query, mode: "insensitive" } },
          ],
        },
        take: 5,
        select: {
          id: true,
          name: true,
          role: true,
          department: true,
        },
      }),
    ])

    // Format results with categories
    const results = [
      ...assets.map((a) => ({
        id: a.id,
        title: a.title,
        subtitle: a.description?.slice(0, 60) || a.type,
        category: "asset" as const,
        type: a.type,
        href: a.type === "DECK" ? "/decks" : a.type === "CAMPAIGN" ? "/campaigns" : a.type === "VIDEO" ? "/videos" : "/assets",
      })),
      ...docsUpdates.map((d) => ({
        id: d.id,
        title: d.title,
        subtitle: d.summary?.slice(0, 60),
        category: "docs" as const,
        href: d.deepLink,
        external: true,
      })),
      ...productUpdates.map((p) => ({
        id: p.id,
        title: p.title,
        subtitle: p.content?.slice(0, 60),
        category: "product" as const,
        type: p.updateType,
        href: "/product",
      })),
      ...teamMembers.map((t) => ({
        id: t.id,
        title: t.name,
        subtitle: `${t.role} - ${t.department}`,
        category: "team" as const,
        href: "/who-is-who",
      })),
    ]

    return NextResponse.json({ results })
  } catch (error) {
    console.error("Search error:", error)
    return NextResponse.json({ error: "Search failed" }, { status: 500 })
  }
}
