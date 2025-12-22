import { getServerSession } from "@/lib/supertokens/session"
import { PortalLayoutClient } from "./PortalLayoutClient"
import { SessionRefreshWrapper } from "@/components/auth/SessionRefreshWrapper"

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession()

  // If no session, wrap in SessionRefreshWrapper to attempt client-side refresh
  // The middleware already checked for tokens, so if we're here, there might be a refresh token
  if (!session) {
    return <SessionRefreshWrapper>{children}</SessionRefreshWrapper>
  }

  return (
    <PortalLayoutClient user={session.user}>
      {children}
    </PortalLayoutClient>
  )
}
