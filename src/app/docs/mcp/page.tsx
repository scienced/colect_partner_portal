import Link from "next/link"

export default function McpDocsPage() {
  return (
    <article className="prose prose-gray max-w-none">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">MCP integration guide</h1>
      <p className="text-gray-600">
        Wire the partner portal into <strong>Claude Desktop</strong> or{" "}
        <strong>Claude Code</strong> so the portal&apos;s assets, docs, product
        updates and team directory are native tools your AI can call.
      </p>

      <h2>What you get</h2>
      <p>
        The MCP server exposes the same content as the REST API as MCP tools:
      </p>
      <ul>
        <li>
          <code>portal_search</code> — full-text search across all content
        </li>
        <li><code>portal_list_assets</code></li>
        <li><code>portal_get_asset</code></li>
        <li><code>portal_list_docs_updates</code></li>
        <li><code>portal_list_product_updates</code></li>
        <li><code>portal_list_who_is_who</code></li>
        <li><code>portal_list_featured</code></li>
        <li><code>portal_me</code> — identify the current key</li>
      </ul>

      <h2>1 · Get an API key</h2>
      <p>
        Sign in to the portal with your partner email and go to{" "}
        <Link href="/settings/api-keys">/settings/api-keys</Link>. Create a key
        labelled with the device you&apos;re setting up (e.g. &quot;Sarah&apos;s
        MacBook&quot;). You&apos;ll see the secret <em>once</em> — copy it now.
      </p>

      <h2>2 · Add the server to Claude Desktop</h2>
      <p>Edit your Claude Desktop config:</p>
      <ul>
        <li>
          macOS:{" "}
          <code>~/Library/Application Support/Claude/claude_desktop_config.json</code>
        </li>
        <li>
          Windows:{" "}
          <code>%APPDATA%\Claude\claude_desktop_config.json</code>
        </li>
      </ul>
      <p>Add an entry under <code>mcpServers</code>:</p>
      <pre>
        <code>{`{
  "mcpServers": {
    "colect-portal": {
      "command": "npx",
      "args": ["-y", "@colect/portal-mcp"],
      "env": {
        "PORTAL_API_KEY": "colect_pk_a1b2c3d4XXXXXXXXXXXXXXXXXXXXXXXX",
        "PORTAL_BASE_URL": "https://partnerportal.colect.io"
      }
    }
  }
}`}</code>
      </pre>
      <p>
        Restart Claude Desktop. The portal tools should appear under the
        🔌 plugins icon on a new conversation.
      </p>

      <h2>3 · Add the server to Claude Code</h2>
      <p>From a terminal:</p>
      <pre>
        <code>{`claude mcp add colect-portal \\
  --env PORTAL_API_KEY="colect_pk_..." \\
  --env PORTAL_BASE_URL="https://partnerportal.colect.io" \\
  -- npx -y @colect/portal-mcp`}</code>
      </pre>

      <h2>Local install (no npm publish needed)</h2>
      <p>While the package is local-only, point Claude at the repo:</p>
      <pre>
        <code>{`{
  "mcpServers": {
    "colect-portal": {
      "command": "node",
      "args": ["/absolute/path/to/colect_partner_portal/mcp-server/index.js"],
      "env": {
        "PORTAL_API_KEY": "colect_pk_...",
        "PORTAL_BASE_URL": "http://localhost:3000"
      }
    }
  }
}`}</code>
      </pre>

      <h2>Trying it</h2>
      <p>In a new Claude conversation, try:</p>
      <blockquote>
        <p>
          &quot;Search the partner portal for sustainability decks and list the
          top three.&quot;
        </p>
      </blockquote>
      <p>
        Claude will pick the <code>portal_search</code> tool, call it, and
        present the results with clickable links back into the portal.
      </p>

      <h2>What gets logged</h2>
      <p>
        Every MCP call is recorded as an <code>MCP_QUERY</code> analytics event
        on the portal, tagged with the API key it rode and the query string.
        That feeds straight into the admin per-user analytics drill-down, so
        you can see which AI-driven questions are hitting which content.
      </p>

      <h2>Safety notes</h2>
      <ul>
        <li>
          The MCP server is <strong>read-only</strong> — no tool can modify
          portal data.
        </li>
        <li>
          The server holds the API key in its own process env. It is not sent
          to Anthropic; it&apos;s only used to authenticate the local-to-portal
          API calls.
        </li>
        <li>
          Revoke the key from{" "}
          <Link href="/settings/api-keys">/settings/api-keys</Link> at any
          time — the change takes effect within a minute.
        </li>
      </ul>
    </article>
  )
}
