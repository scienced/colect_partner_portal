import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/layout/SectionHeader"
import { Card } from "@/components/ui/Card"
import { User, Mail, Linkedin } from "lucide-react"

export default async function WhoIsWhoPage() {
  const teamMembers = await prisma.teamMember.findMany({
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
  })

  const groupedByDepartment = teamMembers.reduce((acc, member) => {
    if (!acc[member.department]) {
      acc[member.department] = []
    }
    acc[member.department].push(member)
    return acc
  }, {} as Record<string, typeof teamMembers>)

  return (
    <div className="space-y-8">
      <PageHeader
        title="Who&apos;s Who at Colect"
        description="Meet the team that supports our partners"
      />

      {Object.keys(groupedByDepartment).length > 0 ? (
        Object.entries(groupedByDepartment).map(([department, members]) => (
          <section key={department}>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {department}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {members.map((member) => (
                <Card key={member.id} padding="lg">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {member.photoUrl ? (
                        <img
                          src={member.photoUrl}
                          alt={member.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-8 h-8 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900">{member.name}</h3>
                      <p className="text-sm text-primary">{member.role}</p>
                      {member.bio && (
                        <p className="text-sm text-gray-600 mt-2">{member.bio}</p>
                      )}
                      <div className="flex items-center gap-3 mt-3">
                        {member.email && (
                          <a
                            href={`mailto:${member.email}`}
                            className="text-gray-400 hover:text-primary transition-colors"
                            title={`Email ${member.name}`}
                          >
                            <Mail className="w-5 h-5" />
                          </a>
                        )}
                        {member.linkedIn && (
                          <a
                            href={member.linkedIn}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-400 hover:text-primary transition-colors"
                            title={`${member.name} on LinkedIn`}
                          >
                            <Linkedin className="w-5 h-5" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        ))
      ) : (
        <Card padding="lg" className="text-center">
          <User className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Team directory coming soon</p>
        </Card>
      )}
    </div>
  )
}
