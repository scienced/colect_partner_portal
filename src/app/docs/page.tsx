import Link from "next/link"
import { Code, Plug } from "lucide-react"

export default function DocsIndexPage() {
  return (
    <article className="prose prose-gray max-w-none">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Developer docs</h1>
      <p className="text-gray-600">
        Read-only API access to the same portal content a partner sees in the
        UI — assets, documentation updates, product updates, featured content,
        and the Who&apos;s Who directory. Built for AI agents and headless
        integrations.
      </p>

      <div className="grid sm:grid-cols-2 gap-4 mt-8 not-prose">
        <Link
          href="/docs/api"
          className="block p-5 rounded-lg border border-gray-200 bg-white hover:border-primary hover:shadow-sm transition"
        >
          <Code className="w-6 h-6 text-primary mb-2" />
          <div className="font-semibold text-gray-900">REST API reference</div>
          <p className="text-sm text-gray-600 mt-1">
            Endpoints, request/response shapes, code samples, and the
            <code className="text-xs"> openapi.json</code> spec.
          </p>
        </Link>
        <Link
          href="/docs/mcp"
          className="block p-5 rounded-lg border border-gray-200 bg-white hover:border-primary hover:shadow-sm transition"
        >
          <Plug className="w-6 h-6 text-primary mb-2" />
          <div className="font-semibold text-gray-900">MCP integration guide</div>
          <p className="text-sm text-gray-600 mt-1">
            Wire the portal into Claude Desktop or Claude Code in two minutes
            using the MCP server.
          </p>
        </Link>
      </div>

      <h2>Quick start</h2>
      <ol>
        <li>
          <Link href="/settings/api-keys">Generate an API key</Link> in the
          portal (sign in with your partner email first).
        </li>
        <li>
          Try a request:
          <pre>
            <code>{`curl -H "Authorization: Bearer colect_pk_…" \\
  https://partnerportal.colect.io/api/v1/me`}</code>
          </pre>
        </li>
        <li>
          Hand the URL <code>https://partnerportal.colect.io/api/v1/openapi.json</code>{" "}
          to your agent to ingest the full API as a tool catalog, or follow the{" "}
          <Link href="/docs/mcp">MCP guide</Link> for a native Claude
          integration.
        </li>
      </ol>
    </article>
  )
}
