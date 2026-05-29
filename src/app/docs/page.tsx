import { Code as CodeIcon, Plug } from "lucide-react"
import {
  H1, H2, Lede, P, A, Ol, Li, Pre, Code, CardGrid, CardLink,
} from "@/components/docs/Prose"

export default function DocsIndexPage() {
  return (
    <article>
      <H1>Developer docs</H1>
      <Lede>
        Read-only API access to the same portal content a partner sees in the
        UI — assets, documentation updates, product updates, featured content,
        and the Who&apos;s Who directory. Built for AI agents and headless
        integrations.
      </Lede>

      <CardGrid>
        <CardLink
          href="/docs/api"
          icon={<CodeIcon className="w-6 h-6" />}
          title="REST API reference"
          description={
            <>
              Endpoints, request and response shapes, code samples, and a link
              to the machine-readable <Code>openapi.json</Code>.
            </>
          }
        />
        <CardLink
          href="/docs/mcp"
          icon={<Plug className="w-6 h-6" />}
          title="MCP integration guide"
          description="Wire the portal into Claude Desktop or Claude Code in two minutes using the MCP server."
        />
      </CardGrid>

      <H2>Quick start</H2>
      <Ol>
        <Li>
          <A href="/settings/api-keys">Generate an API key</A> in the portal
          (sign in with your partner email first).
        </Li>
        <Li>
          Smoke-test it:
          <Pre language="bash">{`curl -H "Authorization: Bearer colect_pk_..." \\
  https://partnerportal.colect.io/api/v1/me`}</Pre>
        </Li>
        <Li>
          Hand the URL{" "}
          <Code>https://partnerportal.colect.io/api/v1/openapi.json</Code> to
          your agent to ingest the full API as a tool catalog, or follow the{" "}
          <A href="/docs/mcp">MCP guide</A> for the native Claude integration.
        </Li>
      </Ol>
    </article>
  )
}
