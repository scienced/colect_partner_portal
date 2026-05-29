import {
  H1, H2, H3, Lede, P, A, Code, Pre, Ul, Li, Callout,
  Endpoint, ParamTable, StatusTable,
} from "@/components/docs/Prose"

export default function ApiDocsPage() {
  return (
    <article>
      <H1>REST API reference</H1>
      <Lede>
        Version 1. Stable. The same surface a logged-in partner sees in the
        portal UI, scoped to your identity — nothing more, nothing less.
      </Lede>

      {/* ──────────────────────────────────────────────────────────────── */}
      <H2 id="base-url">Base URL</H2>
      <Pre>{`https://partnerportal.colect.io/api/v1`}</Pre>

      {/* ──────────────────────────────────────────────────────────────── */}
      <H2 id="authentication">Authentication</H2>
      <P>
        Every request requires a personal API key sent as a Bearer token. Keys
        are generated from <A href="/settings/api-keys">/settings/api-keys</A>.
      </P>
      <Pre language="http">{`Authorization: Bearer colect_pk_a1b2c3d4XXXXXXXXXXXXXXXXXXXXXXXX`}</Pre>
      <P>
        Keys have the literal prefix <Code>colect_pk_</Code> so a leaked key is
        trivially greppable in CI and logs. Treat keys like passwords.
      </P>
      <Callout type="trust" title="Trust model — read this">
        The portal&apos;s login is gated by your company&apos;s email{" "}
        <em>domain</em>, not by individual invitations. So an API key&apos;s
        effective access scope is &quot;everything your partner can see in the
        portal&quot;, regardless of which colleague issued it. Anyone at your
        domain can list and revoke any key — label your keys clearly so
        colleagues can spot stale ones.
      </Callout>

      {/* ──────────────────────────────────────────────────────────────── */}
      <H2 id="errors">Errors</H2>
      <P>
        All errors are JSON with a stable <Code>code</Code> and a
        human-readable <Code>message</Code>. The code is safe to branch on; the
        message may change between versions.
      </P>
      <Pre language="json">{`{
  "error": {
    "code": "unauthorized",
    "message": "API key is invalid, revoked, or expired."
  }
}`}</Pre>
      <StatusTable
        rows={[
          { status: "400", code: "bad_request", meaning: "Missing/invalid query parameter." },
          { status: "401", code: "unauthorized", meaning: "Missing or invalid API key." },
          { status: "404", code: "not_found", meaning: "Resource doesn't exist or isn't published." },
          { status: "429", code: "rate_limited", meaning: "Burst exceeded the per-key cap. Back off." },
          { status: "500", code: "server_error", meaning: "Unexpected — retry once, then report." },
        ]}
      />

      {/* ──────────────────────────────────────────────────────────────── */}
      <H2 id="rate-limits">Rate limits</H2>
      <P>
        <strong>120 requests per minute per key.</strong> Bursts above that get
        a <Code>429</Code> — back off and retry. The window is a per-process
        sliding minute; in practice you have plenty of room for normal agent
        usage.
      </P>

      {/* ──────────────────────────────────────────────────────────────── */}
      <H2 id="endpoints">Endpoints</H2>
      <P>
        The full machine-readable spec is at{" "}
        <A href="/api/v1/openapi.json"><Code>/api/v1/openapi.json</Code></A>{" "}
        (no auth required to read the spec itself — that&apos;s by design, so
        agents can ingest it as a tool catalog).
      </P>

      <Ul>
        <Li><A href="#endpoint-me">GET /api/v1/me</A></Li>
        <Li><A href="#endpoint-search">GET /api/v1/search</A></Li>
        <Li><A href="#endpoint-recent">GET /api/v1/recent</A></Li>
        <Li><A href="#endpoint-assets">GET /api/v1/assets</A></Li>
        <Li><A href="#endpoint-asset-detail">GET /api/v1/assets/&#123;id&#125;</A></Li>
        <Li><A href="#endpoint-docs">GET /api/v1/docs-updates</A></Li>
        <Li><A href="#endpoint-products">GET /api/v1/product-updates</A></Li>
        <Li><A href="#endpoint-team">GET /api/v1/who-is-who</A></Li>
        <Li><A href="#endpoint-featured">GET /api/v1/featured</A></Li>
      </Ul>

      <Callout type="tip" title="Pagination">
        Every list response returns <Code>total</Code>, <Code>limit</Code>,{" "}
        <Code>offset</Code>, and <Code>nextOffset</Code>.{" "}
        <Code>nextOffset</Code> is <Code>null</Code> when you&apos;ve reached
        the end — otherwise it&apos;s the value to pass as the next{" "}
        <Code>offset</Code>.
      </Callout>

      <Callout type="tip" title="Asset URLs — three flavours">
        Every asset (in search and list responses) has three URL fields, each
        for a different purpose:
        <Ul>
          <Li>
            <Code>url</Code> / <Code>portalUrl</Code> — opens the asset drawer
            in the portal. Useful for sending a user a clickable link.
          </Li>
          <Li>
            <Code>download.url</Code> — a <strong>presigned, direct file URL</strong>
            (PDF, video, etc.). Use this to <em>fetch and consume</em> the file
            from an agent. Expires at <Code>download.expiresAt</Code>; re-fetch
            the endpoint to get a fresh one.
          </Li>
          <Li>
            <Code>download.externalLink</Code> — populated when the asset is an
            external link (e.g. a YouTube video) instead of an uploaded file.
          </Li>
        </Ul>
        For docs updates, the direct content URL is the GitBook page in{" "}
        <Code>url</Code>. For product updates, the body text is in the
        <Code>content</Code> field of the list response.
      </Callout>

      <Callout type="tip" title="Incremental sync (&quot;what's new since…&quot;)">
        Every list endpoint accepts <Code>?updatedSince=&lt;ISO 8601&gt;</Code>{" "}
        to return only items updated after that timestamp. Use{" "}
        <Code>/api/v1/recent</Code> for a single sorted view across content
        types.
      </Callout>

      {/* ─── /me ─────────────────────────────────────────────────────── */}
      <Endpoint id="endpoint-me" method="GET" path="/api/v1/me">
        <P>
          Identifies the calling user and API key. Use as a smoke test — if
          this returns 200 with your email, your key is wired correctly.
        </P>
        <Pre language="bash">{`curl -H "Authorization: Bearer colect_pk_..." \\
  https://partnerportal.colect.io/api/v1/me`}</Pre>
        <P>Returns the user, the key&apos;s metadata, and the call source (<Code>API_QUERY</Code> or <Code>MCP_QUERY</Code>).</P>
      </Endpoint>

      {/* ─── /search ─────────────────────────────────────────────────── */}
      <Endpoint id="endpoint-search" method="GET" path="/api/v1/search">
        <P>
          Postgres full-text search across assets, docs updates, product
          updates, team members, and featured content. Results are ranked
          across types — a strong title hit on a deck will beat a body hit on a
          docs page.
        </P>
        <ParamTable
          rows={[
            { name: "q", type: "string (≥ 2 chars)", required: true, description: "Free-text query." },
            { name: "types", type: "string", description: <>Comma-separated subset of <Code>asset, docs_update, product_update, team_member, featured</Code>. Defaults to all.</> },
            { name: "limitPerType", type: "integer 1–25", description: <>Max results per content type. Default <Code>5</Code>.</> },
          ]}
        />
        <H3>Example</H3>
        <Pre language="bash">{`curl -G -H "Authorization: Bearer colect_pk_..." \\
  --data-urlencode "q=sustainability messaging" \\
  --data-urlencode "types=asset,docs_update" \\
  https://partnerportal.colect.io/api/v1/search`}</Pre>
        <H3>Response shape</H3>
        <Pre language="json">{`{
  "query": "sustainability messaging",
  "items": [
    {
      "type": "asset",
      "id": "…",
      "title": "Sustainability messaging deck — EMEA",
      "snippet": "Talking points for Q1 **sustainability** **messaging**…",
      "url": "https://partnerportal.colect.io/decks?asset=…",
      "updatedAt": "2026-05-12T09:00:00.000Z",
      "rank": 0.93,
      "meta": { "assetType": "DECK" },
      "download": {
        "url": "https://s3.eu-west-1.amazonaws.com/…signed…",
        "externalLink": null,
        "expiresAt": "2026-05-12T09:15:00.000Z",
        "fileType": "pdf",
        "fileSize": 1842371,
        "language": "EN"
      }
    }
  ],
  "total": 1
}`}</Pre>
      </Endpoint>

      {/* ─── /recent ─────────────────────────────────────────────────── */}
      <Endpoint id="endpoint-recent" method="GET" path="/api/v1/recent">
        <P>
          Unified, time-sorted feed across the partner-visible content types.
          Use this <em>before</em> calling three separate list endpoints and
          merging client-side.
        </P>
        <ParamTable
          rows={[
            { name: "types", type: "string", description: <>Comma-separated subset of <Code>asset, docs_update, product_update</Code>. Defaults to all.</> },
            { name: "since", type: "string (ISO 8601)", description: "Only items updated after this timestamp." },
            { name: "limit", type: "integer 1–100", description: <>Default <Code>20</Code>.</> },
          ]}
        />
        <H3>Example</H3>
        <Pre language="bash">{`curl -G -H "Authorization: Bearer colect_pk_..." \\
  --data-urlencode "since=2026-05-20T00:00:00Z" \\
  --data-urlencode "limit=10" \\
  https://partnerportal.colect.io/api/v1/recent`}</Pre>
      </Endpoint>

      {/* ─── /assets list ────────────────────────────────────────────── */}
      <Endpoint id="endpoint-assets" method="GET" path="/api/v1/assets">
        <P>List published assets (decks, campaigns, videos, downloadable assets). Pinned items come first; otherwise newest first.</P>
        <ParamTable
          rows={[
            { name: "type", type: "DECK | CAMPAIGN | VIDEO | ASSET", description: "Restrict to one type." },
            { name: "region", type: "string", description: <>e.g. <Code>EMEA</Code>, <Code>APAC</Code>, <Code>Americas</Code>.</> },
            { name: "persona", type: "string", description: <>e.g. <Code>Sales</Code>, <Code>Marketing</Code>, <Code>Technical</Code>.</> },
            { name: "language", type: "string", description: <>Filter to assets that have a variant in this language (e.g. <Code>EN</Code>, <Code>FR</Code>).</> },
            { name: "limit", type: "integer 1–100", description: <>Default <Code>50</Code>.</> },
            { name: "offset", type: "integer ≥ 0", description: <>Default <Code>0</Code>.</> },
          ]}
        />
      </Endpoint>

      {/* ─── /assets/{id} ────────────────────────────────────────────── */}
      <Endpoint id="endpoint-asset-detail" method="GET" path="/api/v1/assets/{id}">
        <P>
          Asset detail, including per-language download URLs. URLs are
          presigned and short-lived (~5 minutes) — fetch fresh ones each time
          you need to actually download.
        </P>
        <Callout type="info">
          Some variants point at an external link (e.g. YouTube) instead of an
          S3 file. In that case, <Code>downloadUrl</Code> is null and{" "}
          <Code>externalLink</Code> is populated.
        </Callout>
      </Endpoint>

      {/* ─── /docs-updates ───────────────────────────────────────────── */}
      <Endpoint id="endpoint-docs" method="GET" path="/api/v1/docs-updates">
        <P>List recently published documentation updates. Pinned items first.</P>
        <ParamTable
          rows={[
            { name: "category", type: "string", description: "Restrict to one category." },
            { name: "limit", type: "integer 1–100", description: <>Default <Code>50</Code>.</> },
            { name: "offset", type: "integer ≥ 0", description: <>Default <Code>0</Code>.</> },
          ]}
        />
      </Endpoint>

      {/* ─── /product-updates ────────────────────────────────────────── */}
      <Endpoint id="endpoint-products" method="GET" path="/api/v1/product-updates">
        <P>
          Product update entries — release notes and upcoming items. Newest
          first.
        </P>
        <ParamTable
          rows={[
            { name: "updateType", type: "release_note | coming_up", description: "Restrict to one type." },
            { name: "limit", type: "integer 1–100", description: <>Default <Code>50</Code>.</> },
            { name: "offset", type: "integer ≥ 0", description: <>Default <Code>0</Code>.</> },
          ]}
        />
      </Endpoint>

      {/* ─── /who-is-who ─────────────────────────────────────────────── */}
      <Endpoint id="endpoint-team" method="GET" path="/api/v1/who-is-who">
        <P>List members of the Colect Who&apos;s Who directory.</P>
        <ParamTable
          rows={[
            { name: "department", type: "string", description: "Restrict to one department." },
            { name: "limit", type: "integer 1–100", description: <>Default <Code>50</Code>.</> },
            { name: "offset", type: "integer ≥ 0", description: <>Default <Code>0</Code>.</> },
          ]}
        />
      </Endpoint>

      {/* ─── /featured ───────────────────────────────────────────────── */}
      <Endpoint id="endpoint-featured" method="GET" path="/api/v1/featured">
        <P>
          Currently-active featured items on the portal homepage. Returns items
          where <Code>startDate ≤ now</Code> and (<Code>endDate is null</Code>{" "}
          or <Code>endDate &gt; now</Code>). No parameters.
        </P>
      </Endpoint>

      {/* ──────────────────────────────────────────────────────────────── */}
      <H2 id="agents">Using with an AI agent</H2>
      <P>
        Most modern agents (Claude, ChatGPT, LangChain/LlamaIndex tools, custom
        runtimes) can ingest an OpenAPI spec directly as a tool catalog. Hand
        them:
      </P>
      <Pre>{`https://partnerportal.colect.io/api/v1/openapi.json`}</Pre>
      <P>
        and the API key. For Claude Desktop or Claude Code specifically, the{" "}
        <A href="/docs/mcp">MCP guide</A> is the smoother path — it installs
        the same surface as native tools.
      </P>

      {/* ──────────────────────────────────────────────────────────────── */}
      <H2 id="versioning">Versioning</H2>
      <P>
        Breaking changes go in a new <Code>/api/v2</Code>. We&apos;ll keep{" "}
        <Code>/api/v1</Code> functional for at least 12 months after a{" "}
        <Code>v2</Code> ships, and announce the deprecation timeline in the
        portal&apos;s Product Updates feed.
      </P>
    </article>
  )
}
