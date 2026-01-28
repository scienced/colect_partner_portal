import { SuperTokensConfig } from "supertokens-auth-react/lib/build/types"
import PasswordlessReact from "supertokens-auth-react/recipe/passwordless"
import SessionReact from "supertokens-auth-react/recipe/session"

const appInfo = {
  appName: process.env.NEXT_PUBLIC_SUPERTOKENS_APP_NAME || "Partner Portal",
  apiDomain: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  websiteDomain: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  apiBasePath: "/api/auth",
  websiteBasePath: "/login",
}

export const frontendConfig = (): SuperTokensConfig => {
  return {
    appInfo,
    recipeList: [
      PasswordlessReact.init({
        contactMethod: "EMAIL",
      }),
      SessionReact.init(),
    ],
  }
}
