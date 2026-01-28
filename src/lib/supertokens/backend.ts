import SuperTokens from "supertokens-node"
import Passwordless from "supertokens-node/recipe/passwordless"
import Session from "supertokens-node/recipe/session"
import { prisma } from "@/lib/prisma"
import { UserRole } from "@prisma/client"

const appInfo = {
  appName: process.env.NEXT_PUBLIC_SUPERTOKENS_APP_NAME || "Partner Portal",
  apiDomain: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  websiteDomain: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  apiBasePath: "/api/auth",
  websiteBasePath: "/login",
}

// Check if email domain is allowed
async function isEmailAllowed(email: string): Promise<boolean> {
  const domain = email.split("@")[1]?.toLowerCase()
  if (!domain) return false

  const allowedDomain = await prisma.allowedDomain.findFirst({
    where: {
      domain: domain,
      isActive: true,
    },
  })

  return !!allowedDomain
}

export function initSupertokens() {
  SuperTokens.init({
    framework: "custom",
    supertokens: {
      connectionURI: process.env.SUPERTOKENS_CONNECTION_URI || "",
      apiKey: process.env.SUPERTOKENS_API_KEY,
    },
    appInfo,
    recipeList: [
      Passwordless.init({
        flowType: "MAGIC_LINK",
        contactMethod: "EMAIL",
        override: {
          apis: (originalImplementation) => ({
            ...originalImplementation,
            createCodePOST: async function (input) {
              if ("email" in input && input.email) {
                const allowed = await isEmailAllowed(input.email)
                if (!allowed) {
                  return {
                    status: "GENERAL_ERROR",
                    message: "This email domain is not authorized for partner access. Please contact support if you believe this is an error.",
                  }
                }
              }
              return originalImplementation.createCodePOST!(input)
            },
          }),
          functions: (originalImplementation) => ({
            ...originalImplementation,
            consumeCode: async function (input) {
              const response = await originalImplementation.consumeCode(input)

              if (response.status === "OK" && response.user) {
                const email = response.user.emails[0]
                const supertokensId = response.user.id

                // Check if user exists
                const existingUser = await prisma.user.findUnique({
                  where: { email },
                })

                if (existingUser) {
                  // Update existing user - sync the ID to match SuperTokens
                  if (existingUser.id !== supertokensId) {
                    // Delete old record and create new one with correct ID
                    await prisma.user.delete({ where: { email } })
                    await prisma.user.create({
                      data: {
                        id: supertokensId,
                        email,
                        name: existingUser.name,
                        role: existingUser.role,
                      },
                    })
                  } else {
                    await prisma.user.update({
                      where: { email },
                      data: { updatedAt: new Date() },
                    })
                  }
                } else {
                  // Create new user
                  await prisma.user.create({
                    data: {
                      id: supertokensId,
                      email,
                      role: UserRole.PARTNER,
                    },
                  })
                }
              }

              return response
            },
          }),
        },
      }),
      Session.init({
        override: {
          functions: (originalImplementation) => ({
            ...originalImplementation,
            createNewSession: async function (input) {
              const session = await originalImplementation.createNewSession(input)

              // Get user from database
              const user = await prisma.user.findUnique({
                where: { id: input.userId },
              })

              if (user) {
                // Add user info to session claims
                await session.mergeIntoAccessTokenPayload({
                  email: user.email,
                  role: user.role,
                })
              }

              return session
            },
          }),
        },
      }),
    ],
  })
}
