import type { Metadata } from 'next'
import './globals.css'

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
      <body suppressHydrationWarning>{children}</body>
    </html>
  )
}
