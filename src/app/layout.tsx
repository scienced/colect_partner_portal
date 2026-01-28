import type { Metadata } from 'next'
import './globals.css'
import { SuperTokensProvider } from '@/components/auth/SuperTokensProvider'
import { SWRProvider } from '@/components/providers/SWRProvider'
import { NavigationProgress } from '@/components/ui/NavigationProgress'
import { Suspense } from 'react'
import { siteConfig, getFullTitle, getPrimaryColorRgb } from '@/config/site'

export const metadata: Metadata = {
  title: getFullTitle(),
  description: siteConfig.tagline,
  icons: {
    icon: '/favicon.png',
    apple: '/favicon.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Inject primary color as CSS variable (supports Tailwind opacity modifiers)
  const primaryColorRgb = getPrimaryColorRgb()

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <style
          dangerouslySetInnerHTML={{
            __html: `:root { --color-primary-rgb: ${primaryColorRgb}; }`,
          }}
        />
      </head>
      <body suppressHydrationWarning>
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        <SuperTokensProvider>
          <SWRProvider>
            {children}
          </SWRProvider>
        </SuperTokensProvider>
      </body>
    </html>
  )
}
