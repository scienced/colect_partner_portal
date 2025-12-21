import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/layout/SectionHeader"
import { TeamMembersList } from "./TeamMembersList"

export default async function AdminWhoIsWhoPage() {
  const teamMembers = await prisma.teamMember.findMany({
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Who's Who"
        description="Manage the team directory"
      />
      <TeamMembersList initialMembers={teamMembers} />
    </div>
  )
}
