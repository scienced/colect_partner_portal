import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/layout/SectionHeader"
import { DocsUpdatesList } from "./DocsUpdatesList"

export default async function AdminDocsUpdatesPage() {
  const docsUpdates = await prisma.docsUpdate.findMany({
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documentation Updates"
        description="Manage documentation update announcements"
      />
      <DocsUpdatesList initialDocs={docsUpdates} />
    </div>
  )
}
