import { redirect } from "next/navigation"
import { getServerSession } from "@/lib/supertokens/session"
import { UserRole } from "@prisma/client"
import { AdminSidebar } from "@/components/admin/AdminSidebar"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession()

  if (!session) {
    redirect("/login")
  }

  if (session.user?.role !== UserRole.ADMIN) {
    redirect("/")
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <AdminSidebar />
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-6xl">{children}</div>
      </main>
    </div>
  )
}
