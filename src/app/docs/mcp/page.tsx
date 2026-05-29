import {
  H1, H2, H3, Lede, P, A, Code, Pre, Ul, Li, Ol, Callout,
} from "@/components/docs/Prose"

export default function McpDocsPage() {
  return (
    <article>
      <H1>MCP integration guide</H1>
      <Lede>
        Wire the partner portal into <strong>Claude Desktop</strong> or{" "}
        <strong>Claude Code</strong> so the portal&apos;s assets, docs, product
        updates and team directory are native tools your AI can call —
        no copy-pasting endpoints into prompts.
      </Lede>

      <H2 id="what-you-get">What you get</H2>
      <P>
        Eight read-only MCP tools, one per content type plus a search tool and
        a smoke-test tool:
      </P>
      <Ul>
        <Li><Code>portal_me</Code> — identify the current key. Smoke test.</Li>
        <Li><Code>portal_search</Code> — full-text search across all content.</Li>
        <Li><Code>portal_list_recent</Code> — unified &quot;what&apos;s new&quot; feed across content types.</Li>
        <Li><Code>portal_list_assets</Code> — list/filter assets.</Li>
        <Li><Code>portal_get_asset</Code> — asset detail with presigned download URLs.</Li>
        <Li><Code>portal_list_docs_updates</Code> — documentation updates.</Li>
        <Li><Code>portal_list_product_updates</Code> — release notes and upcoming items.</Li>
        <Li><Code>portal_list_who_is_who</Code> — team directory.</Li>
        <Li><Code>portal_list_featured</Code> — currently-active featured items.</Li>
      </Ul>

      <H2 id="step-1">Step 1 — Get an API key</H2>
      <P>
        Sign in to the portal with your partner email and go to{" "}
        <A href="/settings/api-keys">/settings/api-keys</A>. Create a key
        labelled with the device you&apos;re setting up (for example{" "}
        <em>&quot;Sarah&apos;s MacBook&quot;</em>). You&apos;ll see the secret{" "}
        <strong>once</strong> — copy it now and put it in your password
        manager.
      </P>

      <H2 id="step-2">Step 2 — Add the server to Claude Desktop</H2>
      <P>Edit your Claude Desktop config file:</P>
      <Ul>
        <Li>
          macOS:{" "}
          <Code>~/Library/Application Support/Claude/claude_desktop_config.json</Code>
        </Li>
        <Li>
          Windows:{" "}
          <Code>%APPDATA%\Claude\claude_desktop_config.json</Code>
        </Li>
      </Ul>
      <P>
        Add an entry under <Code>mcpServers</Code>:
      </P>
      <Pre language="json">{`{
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
}`}</Pre>
      <P>
        Restart Claude Desktop. The portal tools appear under the 🔌 plugins
        icon on a new conversation.
      </P>

      <H2 id="step-3">Step 3 — Or add it to Claude Code</H2>
      <P>From a terminal:</P>
      <Pre language="bash">{`claude mcp add colect-portal \\
  --env PORTAL_API_KEY="colect_pk_..." \\
  --env PORTAL_BASE_URL="https://partnerportal.colect.io" \\
  -- npx -y @colect/portal-mcp`}</Pre>

      <H2 id="claude-ai">Step 3b — Or add it to Claude.ai (the web chat)</H2>
      <P>
        Claude.ai supports MCP servers through its <strong>Custom
        Connectors</strong> feature (Settings → Connectors). Custom Connectors
        require a server reachable over HTTPS — not a local stdio process.
      </P>
      <Callout type="info" title="Status: not yet enabled">
        The portal&apos;s MCP server is currently <strong>stdio-only</strong>,
        which is exactly what Claude Desktop and Claude Code need. Claude.ai
        Custom Connectors require a <strong>remote HTTP MCP endpoint</strong>
        — which we&apos;ll ship at{" "}
        <Code>https://partnerportal.colect.io/api/v1/mcp</Code> in a follow-up.
        When that goes live, the setup will be:
      </Callout>
      <Ol>
        <Li>In Claude.ai, open <strong>Settings → Connectors</strong>.</Li>
        <Li>Click <strong>Add custom connector</strong>.</Li>
        <Li>
          Paste the URL{" "}
          <Code>https://partnerportal.colect.io/api/v1/mcp</Code>.
        </Li>
        <Li>
          When prompted for credentials, paste your{" "}
          <Code>colect_pk_…</Code> API key as the Bearer token.
        </Li>
        <Li>Save. The portal tools become available in every conversation.</Li>
      </Ol>
      <P>
        Until the remote endpoint ships, the alternative for Claude.ai is to
        give Claude the OpenAPI spec URL{" "}
        <A href="/api/v1/openapi.json"><Code>/api/v1/openapi.json</Code></A>{" "}
        and your API key in a project — Claude can then call the REST API
        directly. It works, but it&apos;s not as smooth as the connector path.
      </P>

      <H2 id="local">Local install (no npm publish)</H2>
      <P>
        While the package isn&apos;t on npm yet, point Claude at the file in
        this repo:
      </P>
      <Pre language="json">{`{
  "mcpServers": {
    "colect-portal-local": {
      "command": "node",
      "args": ["/absolute/path/to/colect_partner_portal/mcp-server/index.js"],
      "env": {
        "PORTAL_API_KEY": "colect_pk_...",
        "PORTAL_BASE_URL": "http://localhost:3000"
      }
    }
  }
}`}</Pre>

      <H2 id="trying">Trying it</H2>
      <P>In a new Claude conversation, try:</P>
      <Callout type="tip">
        <em>
          &quot;Search the partner portal for sustainability decks and list the
          top three.&quot;
        </em>
      </Callout>
      <P>
        Claude will pick the <Code>portal_search</Code> tool, call it, and
        present the results with clickable links back into the portal.
      </P>

      <H2 id="logging">What gets logged</H2>
      <P>
        Every MCP call is recorded as an <Code>MCP_QUERY</Code> analytics event
        on the portal, tagged with the API key it rode and the query string.
        That feeds straight into the admin per-user analytics drilldown, so
        you can see which AI-driven questions are hitting which content.
      </P>

      <H2 id="safety">Safety notes</H2>
      <Ol>
        <Li>
          The MCP server is <strong>read-only</strong>. No tool can modify
          portal data.
        </Li>
        <Li>
          The server holds the API key in its own process environment. It is
          never sent to Anthropic — it&apos;s only used to authenticate the
          local-to-portal API calls.
        </Li>
        <Li>
          Revoke the key from{" "}
          <A href="/settings/api-keys">/settings/api-keys</A> at any time. The
          change takes effect within a minute.
        </Li>
      </Ol>
    </article>
  )
}
