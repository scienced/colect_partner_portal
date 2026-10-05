import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"
import Session from "supertokens-node/recipe/session"
import { prisma } from "@/lib/prisma"
import { initSupertokens } from "./backend"
import { UserRole } from "@prisma/client"
import { getViewer, PARTNER_VIEWER, type Viewer } from "@/lib/access"

// Initialize SuperTokens
initSupertokens()

export interface SessionUser {
  id: string
  email: string
  name: string | null
  role: UserRole
}

export interface SessionData {
  userId: string
  user: SessionUser | null
}

/**
 * Get the current session from server-side
 */
export async function getServerSession(): Promise<SessionData | null> {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get("sAccessToken")?.value
    const antiCsrf = cookieStore.get("sAntiCsrf")?.value

    if (!accessToken) {
      return null
    }

    const session = await Session.getSessionWithoutRequestResponse(
      accessToken,
      antiCsrf
    )

    if (!session) {
      return null
    }

    const userId = session.getUserId()
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    return {
      userId,
      user,
    }
  } catch (error) {
    console.error("Error getting session:", error)
    return null
  }
}

/**
 * Require an authenticated session, throw if not authenticated
 */
export async function requireSession(): Promise<SessionData> {
  const session = await getServerSession()

  if (!session) {
    throw new Error("Unauthorized")
  }

  return session
}

/**
 * Require admin role, throw if not admin
 */
export async function requireAdmin(): Promise<SessionData> {
  const session = await requireSession()

  if (session.user?.role !== UserRole.ADMIN) {
    throw new Error("Forbidden: Admin access required")
  }

  return session
}

/**
 * Resolve the logged-in user's content audience (employee vs partner).
 * Returns null when there's no session. A session whose user row is missing
 * gets the partner-safe audience rather than an error.
 */
export async function getSessionViewer(): Promise<{ session: SessionData; viewer: Viewer } | null> {
  const session = await getServerSession()
  if (!session) return null
  const viewer = session.user ? await getViewer(session.user) : PARTNER_VIEWER
  return { session, viewer }
}

/**
 * Check if user is authenticated (for use in layouts)
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getServerSession()
  return session !== null
}

/**
 * Check if user is admin (for use in layouts)
 */
export async function isAdmin(): Promise<boolean> {
  const session = await getServerSession()
  return session?.user?.role === UserRole.ADMIN
}
