import Link from "next/link"
import type { ReactNode } from "react"
import { siteConfig } from "@/config/site"

export const metadata = {
  title: `${siteConfig.name} — Developer docs`,
  description: "API reference and MCP integration guide for the Colect Partner Portal.",
}

export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between flex-wrap gap-3">
          <Link href="/docs" className="flex items-center gap-2 text-gray-900 font-semibold">
            {siteConfig.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={siteConfig.logoUrl} alt={siteConfig.name} className="h-6 w-auto" />
            )}
            <span>{siteConfig.name}</span>
            <span className="text-gray-400">/</span>
            <span className="text-gray-600 font-normal">Developer docs</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/docs/api" className="text-gray-700 hover:text-primary">API</Link>
            <Link href="/docs/mcp" className="text-gray-700 hover:text-primary">MCP</Link>
            <Link href="/api/v1/openapi.json" className="text-gray-700 hover:text-primary">openapi.json</Link>
            <Link
              href="/settings/api-keys"
              className="px-3 py-1.5 rounded bg-primary text-white hover:opacity-90"
            >
              Get an API key
            </Link>
          </nav>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-10">{children}</main>
    </div>
  )
}
