# `@colect/portal-mcp`

> **Use the hosted server instead.** The portal now serves MCP itself at
> `https://partnerportal.colect.io/api/v1/mcp` (Streamable HTTP, Bearer API
> key) — nothing to install, and it includes the content write tools for
> admin keys. Setup: <https://partnerportal.colect.io/docs/mcp>.
>
> This local stdio server is kept for offline development only. It is
> read-only and was never published to npm, so `npx @colect/portal-mcp`
> does not work — run it from this folder with `node index.js`.

MCP server that exposes the Colect Partner Portal content as native Claude tools.
Once configured, Claude can search, list, and fetch portal assets, docs updates,
product updates, the team directory, and featured content directly — without
leaving the chat.

## Prerequisites

- Node ≥ 18
- A personal API key from <https://partnerportal.colect.io/settings/api-keys>

## Install (local)

```bash
cd mcp-server
npm install
```

## Configure Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`
(macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "colect-portal": {
      "command": "node",
      "args": ["/absolute/path/to/colect_partner_portal/mcp-server/index.js"],
      "env": {
        "PORTAL_API_KEY": "colect_pk_…",
        "PORTAL_BASE_URL": "https://partnerportal.colect.io"
      }
    }
  }
}
```

Restart Claude Desktop. The portal tools appear under the 🔌 plugins menu.

## Configure Claude Code

```bash
claude mcp add colect-portal \
  --env PORTAL_API_KEY="colect_pk_..." \
  --env PORTAL_BASE_URL="https://partnerportal.colect.io" \
  -- node /absolute/path/to/colect_partner_portal/mcp-server/index.js
```

## Tools

| Tool                          | What it does                                            |
| ----------------------------- | ------------------------------------------------------- |
| `portal_me`                   | Identify the calling key. Smoke test.                   |
| `portal_search`               | Full-text search across all content.                    |
| `portal_list_assets`          | List/filter assets.                                     |
| `portal_get_asset`            | Asset detail with presigned download URLs.              |
| `portal_list_docs_updates`    | Documentation updates.                                  |
| `portal_list_product_updates` | Product release notes and upcoming items.               |
| `portal_list_who_is_who`      | Team directory.                                         |
| `portal_list_featured`        | Currently-active featured homepage items.               |

## Notes

- **Read-only.** No tool can modify portal data.
- **Same scope as the UI.** The API key inherits whatever its issuing user
  sees in the portal — nothing admin-only is exposed.
- **Audited.** Every call is logged in the portal as an `MCP_QUERY`
  analytics event tagged with the API key used.
- **Revoke at any time.** Visit `/settings/api-keys` and click Revoke. The
  change is live within a minute.
