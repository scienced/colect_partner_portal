import {
  H1, H2, Lede, P, A, Code, Pre, Ul, Li, Ol, Callout,
} from "@/components/docs/Prose"

export default function McpDocsPage() {
  return (
    <article>
      <H1>MCP integration guide</H1>
      <Lede>
        Connect <strong>Claude Code</strong>, <strong>Claude Desktop</strong>{" "}
        or any MCP client to the portal, so its assets, docs, product updates
        and team directory are native tools your AI can call. The server is
        hosted by the portal — there is nothing to install.
      </Lede>

      <H2 id="what-you-get">What you get</H2>
      <P>Eleven read tools for every key:</P>
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
        <Li><Code>portal_list_ads</Code> / <Code>portal_get_ad</Code> — LinkedIn ad sets: visuals and copy.</Li>
      </Ul>
      <P>
        Admins with a write-enabled key (see Step 1) also get the write tools to
        add content:
      </P>
      <Ul>
        <Li><Code>portal_create_upload</Code> — get a URL to upload a file or thumbnail to.</Li>
        <Li><Code>portal_create_asset</Code> — create a deck, campaign, video or asset, including who can see it.</Li>
        <Li><Code>portal_update_asset</Code> — edit, publish/unpublish, or change visibility of an asset.</Li>
        <Li><Code>portal_create_ad</Code> / <Code>portal_update_ad</Code> — create or edit a LinkedIn ad set (several visuals + copy versions).</Li>
      </Ul>

      <H2 id="step-1">Step 1 — Get an API key</H2>
      <P>
        Sign in to the portal and go to{" "}
        <A href="/settings/api-keys">/settings/api-keys</A>. Create a key
        labelled with the device you&apos;re setting up (for example{" "}
        <em>&quot;Sarah&apos;s MacBook&quot;</em>). You&apos;ll see the secret{" "}
        <strong>once</strong> — copy it now and put it in your password
        manager.
      </P>
      <P>
        Admins see an extra option, <strong>Allow creating and editing
        content</strong>. Tick it only for keys an agent should use to add
        content.
      </P>

      <H2 id="step-2">Step 2 — Connect</H2>
      <P>The server address is:</P>
      <Pre>{`https://partnerportal.colect.io/api/v1/mcp`}</Pre>
      <P>Authenticate with your key as a Bearer token.</P>

      <H2 id="claude-code">Claude Code</H2>
      <Pre language="bash">{`claude mcp add --transport http colect-portal \\
  https://partnerportal.colect.io/api/v1/mcp \\
  --header "Authorization: Bearer colect_pk_..."`}</Pre>
      <P>
        Run <Code>/mcp</Code> inside Claude Code to check that{" "}
        <Code>colect-portal</Code> is connected.
      </P>

      <H2 id="claude-desktop">Claude Desktop</H2>
      <P>
        Claude Desktop starts MCP servers from its config file, so it reaches
        the hosted server through the small <Code>mcp-remote</Code> bridge
        (needs Node 18+). Edit:
      </P>
      <Ul>
        <Li>
          macOS:{" "}
          <Code>~/Library/Application Support/Claude/claude_desktop_config.json</Code>
        </Li>
        <Li>
          Windows: <Code>%APPDATA%\Claude\claude_desktop_config.json</Code>
        </Li>
      </Ul>
      <Pre language="json">{`{
  "mcpServers": {
    "colect-portal": {
      "command": "npx",
      "args": [
        "-y", "mcp-remote",
        "https://partnerportal.colect.io/api/v1/mcp",
        "--header", "Authorization:\${PORTAL_AUTH}"
      ],
      "env": {
        "PORTAL_AUTH": "Bearer colect_pk_..."
      }
    }
  }
}`}</Pre>
      <P>
        Restart Claude Desktop. The portal tools appear under the tools icon
        in a new conversation.
      </P>

      <H2 id="claude-ai">Claude.ai (web)</H2>
      <Callout type="info" title="Not yet supported">
        Custom connectors on claude.ai sign in with OAuth, which the portal
        doesn&apos;t offer yet — it uses API keys. Until then, use Claude Code
        or Claude Desktop, or give Claude the OpenAPI spec at{" "}
        <A href="/api/v1/openapi.json"><Code>/api/v1/openapi.json</Code></A>{" "}
        plus your key in a project so it calls the REST API directly.
      </Callout>

      <H2 id="other-clients">Other MCP clients</H2>
      <P>
        Any client that speaks the MCP <em>Streamable HTTP</em> transport and
        lets you set a request header works: point it at the URL above with{" "}
        <Code>Authorization: Bearer colect_pk_…</Code>.
      </P>

      <H2 id="trying">Trying it</H2>
      <P>In a new Claude conversation, try:</P>
      <Callout type="tip">
        <em>
          &quot;Search the partner portal for sustainability decks and list the
          top three.&quot;
        </em>
      </Callout>
      <P>With a write-enabled key:</P>
      <Callout type="tip">
        <em>
          &quot;Upload ./pricing-2027.pdf to the partner portal as a sales deck
          called &lsquo;Pricing playbook 2027&rsquo;, employees only, tagged Le
          New Black, and publish it.&quot;
        </em>
      </Callout>
      <P>
        Uploads take two steps under the hood: the agent asks for an upload
        URL, then sends the file there itself (Claude Code does this with{" "}
        <Code>curl</Code>). Links such as YouTube or Google Slides need no
        upload.
      </P>

      <H2 id="visibility">Who sees what</H2>
      <Ul>
        <Li>
          <strong>Partners</strong> see content set to <Code>EVERYONE</Code>.
        </Li>
        <Li>
          <strong>Colect and Le New Black staff</strong> also see content set
          to <Code>EMPLOYEES</Code>, plus the internal Colect / Le New Black
          tag on each asset.
        </Li>
        <Li>
          An agent sees exactly what its key&apos;s owner sees in the portal.
        </Li>
      </Ul>

      <H2 id="logging">What gets logged</H2>
      <P>
        Every MCP call is recorded as an <Code>MCP_QUERY</Code> analytics event
        on the portal, tagged with the API key it rode and the query string.
        Content an agent creates or edits shows up in the change log with the
        key that did it.
      </P>

      <H2 id="safety">Safety notes</H2>
      <Ol>
        <Li>
          Keys are read-only unless an admin ticked <em>Allow creating and
          editing content</em>. Write access stops as soon as the key&apos;s
          owner is no longer an admin.
        </Li>
        <Li>Nothing can be deleted through MCP or the API.</Li>
        <Li>
          New content is saved as a draft unless the agent explicitly
          publishes it, and an agent always has to choose who can see it.
        </Li>
        <Li>
          Revoke a key from{" "}
          <A href="/settings/api-keys">/settings/api-keys</A> at any time. It
          stops working immediately.
        </Li>
      </Ol>
    </article>
  )
}
