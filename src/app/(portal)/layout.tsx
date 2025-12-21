import { redirect } from "next/navigation"
import { getServerSession } from "@/lib/supertokens/session"
import { PortalLayoutClient } from "./PortalLayoutClient"

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession()

  if (!session) {
    redirect("/login")
  }

  return (
    <PortalLayoutClient user={session.user}>
      {children}
    </PortalLayoutClient>
  )
}
