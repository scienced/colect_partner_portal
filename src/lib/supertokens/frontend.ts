import SuperTokens from "supertokens-web-js"
import Passwordless from "supertokens-web-js/recipe/passwordless"
import Session from "supertokens-web-js/recipe/session"

let initialized = false

export function initSupertokensFrontend() {
  if (typeof window === "undefined") {
    return
  }

  if (initialized) {
    return // Already initialized, skip silently
  }

  try {
    SuperTokens.init({
      appInfo: {
        appName: process.env.NEXT_PUBLIC_SUPERTOKENS_APP_NAME || "Partner Portal",
        apiDomain: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        apiBasePath: "/api/auth",
      },
      recipeList: [
        Passwordless.init(),
        Session.init(),
      ],
    })
    initialized = true
  } catch (err: any) {
    // SuperTokens throws if already initialized - that's fine
    if (err?.message?.includes("already initialized")) {
      initialized = true
    } else {
      throw err
    }
  }
}
