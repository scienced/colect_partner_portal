import type { Metadata } from 'next'
import './globals.css'
import { SuperTokensProvider } from '@/components/auth/SuperTokensProvider'
import { NavigationProgress } from '@/components/ui/NavigationProgress'
import { Suspense } from 'react'

export const metadata: Metadata = {
  title: 'Colect Partner Portal',
  description: 'Partner-only workspace for resellers and system integrators',
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
          {children}
        </SuperTokensProvider>
      </body>
    </html>
  )
}
