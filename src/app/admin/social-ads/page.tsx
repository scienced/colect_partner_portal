import { PageHeader } from "@/components/layout/SectionHeader"
import { getSessionViewer } from "@/lib/supertokens/session"
import { findAdSets, serializeAdSets } from "@/lib/adSets"
import { SocialAdsList } from "./SocialAdsList"

export const dynamic = "force-dynamic"

export default async function AdminSocialAdsPage() {
  // The admin layout redirects non-admins; render nothing rather than throw
  // (layout and page render in parallel).
  const auth = await getSessionViewer()
  if (!auth?.viewer.isAdmin) return null
  const { viewer } = auth
  const { rows } = await findAdSets(viewer, { includeDrafts: true })
  const items = await serializeAdSets(rows, viewer)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Social Ads"
        description="LinkedIn ad sets — visuals and copy, grouped per campaign"
      />
      <SocialAdsList initialItems={items} />
    </div>
  )
}
