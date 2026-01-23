import type { Metadata } from 'next'
import './globals.css'
import { SuperTokensProvider } from '@/components/auth/SuperTokensProvider'
import { SWRProvider } from '@/components/providers/SWRProvider'
import { NavigationProgress } from '@/components/ui/NavigationProgress'
import { Suspense } from 'react'

export const metadata: Metadata = {
  title: 'Colect Partner Portal',
  description: 'Partner-only workspace for resellers and system integrators',
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
  return (
    <html lang="en" suppressHydrationWarning>
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
