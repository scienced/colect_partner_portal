import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/layout/SectionHeader"
import { Card } from "@/components/ui/Card"
import { StatusBadge } from "@/components/layout/SectionHeader"
import { Package, Sparkles, ExternalLink } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

export default async function ProductPage() {
  const productUpdates = await prisma.productUpdate.findMany({
    where: { publishedAt: { not: null } },
    orderBy: { publishedAt: "desc" },
  })

  const releaseNotes = productUpdates.filter((p) => p.updateType === "release_note")
  const comingUp = productUpdates.filter((p) => p.updateType === "coming_up")

  return (
    <div className="space-y-8">
      <PageHeader
        title="Product Updates"
        description="Latest releases and upcoming features"
      />

      {/* Release Notes */}
      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Package className="w-5 h-5 text-gray-400" />
          Release Notes
        </h2>
        {releaseNotes.length > 0 ? (
          <div className="space-y-4">
            {releaseNotes.map((update) => (
              <Card key={update.id} padding="lg">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">{update.title}</h3>
                    <p className="text-gray-600 mt-2">{update.content}</p>
                    {update.link && (
                      <a
                        href={update.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-2 text-primary hover:underline text-sm font-medium"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Learn more
                      </a>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {update.releaseDate && (
                      <StatusBadge status="success">
                        {new Date(update.releaseDate).toLocaleDateString()}
                      </StatusBadge>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card padding="lg" className="text-center">
            <p className="text-gray-500">No release notes yet</p>
          </Card>
        )}
      </section>

      {/* Coming Up */}
      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-yellow-500" />
          Coming Up
        </h2>
        {comingUp.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {comingUp.map((update) => (
              <Card key={update.id} padding="lg" className="border-l-4 border-l-yellow-400">
                <h3 className="font-semibold text-gray-900">{update.title}</h3>
                <p className="text-gray-600 mt-2">{update.content}</p>
              </Card>
            ))}
          </div>
        ) : (
          <Card padding="lg" className="text-center">
            <p className="text-gray-500">No upcoming features announced</p>
          </Card>
        )}
      </section>
    </div>
  )
}
