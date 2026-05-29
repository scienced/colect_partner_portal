import Link from "next/link"

export default function ApiDocsPage() {
  return (
    <article className="prose prose-gray max-w-none">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">REST API reference</h1>
      <p className="text-gray-600">
        Version 1. Stable. The same surface a logged-in partner sees in the
        portal UI, scoped to your identity — nothing more, nothing less.
      </p>

      <h2>Base URL</h2>
      <pre>
        <code>https://partnerportal.colect.io/api/v1</code>
      </pre>

      <h2>Authentication</h2>
      <p>
        Every request requires a personal API key sent as a Bearer token. Keys
        are generated from{" "}
        <Link href="/settings/api-keys">/settings/api-keys</Link>.
      </p>
      <pre>
        <code>Authorization: Bearer colect_pk_a1b2c3d4XXXXXXXXXXXXXXXXXXXXXXXX</code>
      </pre>
      <p>
        Keys have the literal prefix <code>colect_pk_</code> so a leaked key is
        trivially greppable in CI/logs. Treat keys like passwords. If a key
        leaks, any user at your domain can revoke it.
      </p>

      <h2>Errors</h2>
      <p>All errors are JSON with a stable <code>code</code> and a human <code>message</code>:</p>
      <pre>
        <code>{`{ "error": { "code": "unauthorized", "message": "..." } }`}</code>
      </pre>
      <p>
        <strong>400</strong> <code>bad_request</code> · <strong>401</strong>{" "}
        <code>unauthorized</code> · <strong>404</strong> <code>not_found</code> ·{" "}
        <strong>429</strong> <code>rate_limited</code> · <strong>500</strong>{" "}
        <code>server_error</code>.
      </p>

      <h2>Rate limits</h2>
      <p>
        120 requests per minute per key. Bursts above that get a 429 — back off
        and retry.
      </p>

      <h2>Endpoints</h2>
      <p>The full machine-readable spec is at{" "}
        <Link href="/api/v1/openapi.json"><code>/api/v1/openapi.json</code></Link>{" "}
        (no auth required to read the spec itself).
      </p>

      <h3>GET /api/v1/me</h3>
      <p>Identifies the calling user and API key. Use as a smoke test.</p>
      <pre>
        <code>{`curl -H "Authorization: Bearer colect_pk_..." \\
  https://partnerportal.colect.io/api/v1/me`}</code>
      </pre>

      <h3>GET /api/v1/search?q=…</h3>
      <p>
        Postgres full-text search across assets, docs updates, product updates,
        team members, and featured content. Ranks results across types. Optional{" "}
        <code>types=asset,docs_update</code> filter. <code>limitPerType</code>{" "}
        defaults to 5 (max 25).
      </p>
      <pre>
        <code>{`curl -G -H "Authorization: Bearer colect_pk_..." \\
  --data-urlencode "q=sustainability messaging" \\
  --data-urlencode "types=asset,docs_update" \\
  https://partnerportal.colect.io/api/v1/search`}</code>
      </pre>

      <h3>GET /api/v1/assets</h3>
      <p>
        List assets. Filters: <code>type</code> (<code>DECK</code>,{" "}
        <code>CAMPAIGN</code>, <code>VIDEO</code>, <code>ASSET</code>),{" "}
        <code>region</code>, <code>language</code> (e.g. <code>EN</code>),{" "}
        <code>persona</code>. Paginate with <code>limit</code> /{" "}
        <code>offset</code>.
      </p>

      <h3>GET /api/v1/assets/{`{id}`}</h3>
      <p>
        Asset detail, including per-language download URLs. Download URLs are
        presigned and short-lived (~5 minutes) — fetch fresh ones when you need
        to actually download.
      </p>

      <h3>GET /api/v1/docs-updates</h3>
      <p>List documentation updates. Filter by <code>category</code>.</p>

      <h3>GET /api/v1/product-updates</h3>
      <p>
        List product updates. Filter by <code>updateType</code>:{" "}
        <code>release_note</code> or <code>coming_up</code>.
      </p>

      <h3>GET /api/v1/who-is-who</h3>
      <p>List team members. Filter by <code>department</code>.</p>

      <h3>GET /api/v1/featured</h3>
      <p>Currently-active featured items (no parameters).</p>

      <h2>Using with an AI agent</h2>
      <p>
        Most modern agents (Claude, ChatGPT, custom LangChain/LlamaIndex tools)
        can ingest an OpenAPI spec directly as a tool catalog. Hand them:
      </p>
      <pre>
        <code>https://partnerportal.colect.io/api/v1/openapi.json</code>
      </pre>
      <p>
        and the API key. For Claude Desktop or Claude Code specifically, the{" "}
        <Link href="/docs/mcp">MCP guide</Link> is the smoother path — it
        installs the same surface as native tools.
      </p>

      <h2>Trust model — be aware</h2>
      <p>
        The portal&apos;s login is gated by your <em>company&apos;s email
        domain</em>, not by individual invitations. So an API key&apos;s
        effective access scope is &quot;everything your partner can see in the
        portal&quot;, regardless of which colleague happened to issue it.
        Anyone at your domain can list and revoke any key. Label your keys
        clearly so colleagues can spot stale ones.
      </p>

      <h2>Versioning</h2>
      <p>
        Breaking changes go in a new <code>/api/v2</code>. We&apos;ll keep{" "}
        <code>/api/v1</code> functional for at least 12 months after a{" "}
        <code>v2</code> ships and announce the deprecation timeline in the
        portal&apos;s Product Updates feed.
      </p>
    </article>
  )
}
