import * as postmark from "postmark"
import { siteConfig, getSenderEmail, getFullTitle } from "@/config/site"

// Lazy initialization to avoid issues during build
let _client: postmark.ServerClient | null = null

function getClient(): postmark.ServerClient {
  if (!_client) {
    const apiKey = process.env.POSTMARK_API_KEY
    if (!apiKey) {
      throw new Error("POSTMARK_API_KEY is not configured")
    }
    _client = new postmark.ServerClient(apiKey)
  }
  return _client
}

const FROM_EMAIL = getSenderEmail()
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

export interface DigestContent {
  newAssets: Array<{
    id: string
    title: string
    type: string
  }>
  newDocsUpdates: Array<{
    id: string
    title: string
  }>
  newProductUpdates: Array<{
    id: string
    title: string
    updateType: string
  }>
}

export async function sendDigestEmail(
  to: string,
  name: string,
  content: DigestContent
): Promise<void> {
  const hasContent =
    content.newAssets.length > 0 ||
    content.newDocsUpdates.length > 0 ||
    content.newProductUpdates.length > 0

  if (!hasContent) {
    return
  }

  const htmlBody = generateDigestHtml(name, content)
  const textBody = generateDigestText(name, content)

  await getClient().sendEmail({
    From: FROM_EMAIL,
    To: to,
    Subject: "Weekly Partner Portal Update",
    HtmlBody: htmlBody,
    TextBody: textBody,
  })
}

function generateDigestHtml(name: string, content: DigestContent): string {
  let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .logo { color: #ef556d; font-size: 24px; font-weight: bold; }
    h1 { color: #111827; font-size: 24px; margin-bottom: 8px; }
    h2 { color: #374151; font-size: 18px; margin-top: 24px; margin-bottom: 12px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; }
    .item { padding: 12px; margin-bottom: 8px; background: #f9fafb; border-radius: 8px; }
    .item a { color: #ef556d; text-decoration: none; font-weight: 500; }
    .item a:hover { text-decoration: underline; }
    .tag { display: inline-block; padding: 2px 8px; background: #e5e7eb; color: #4b5563; font-size: 12px; border-radius: 4px; margin-left: 8px; }
    .cta { text-align: center; margin-top: 30px; }
    .cta a { display: inline-block; padding: 12px 24px; background: #ef556d; color: white; text-decoration: none; border-radius: 6px; font-weight: 500; }
    .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 14px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">${siteConfig.name}</div>
    <h1>Weekly ${siteConfig.title} Update</h1>
    <p>Hi ${name}, here's what's new this week!</p>
  </div>
`

  if (content.newAssets.length > 0) {
    html += `
  <h2>New Sales Materials</h2>
`
    for (const asset of content.newAssets) {
      html += `
  <div class="item">
    <a href="${APP_URL}/decks">${asset.title}</a>
    <span class="tag">${asset.type}</span>
  </div>
`
    }
  }

  if (content.newDocsUpdates.length > 0) {
    html += `
  <h2>Documentation Updates</h2>
`
    for (const doc of content.newDocsUpdates) {
      html += `
  <div class="item">
    <a href="${APP_URL}/docs-updates">${doc.title}</a>
  </div>
`
    }
  }

  if (content.newProductUpdates.length > 0) {
    html += `
  <h2>Product Updates</h2>
`
    for (const update of content.newProductUpdates) {
      const label = update.updateType === "release_note" ? "Release" : "Coming Soon"
      html += `
  <div class="item">
    <a href="${APP_URL}/product">${update.title}</a>
    <span class="tag">${label}</span>
  </div>
`
    }
  }

  html += `
  <div class="cta">
    <a href="${APP_URL}">Visit Partner Portal</a>
  </div>

  <div class="footer">
    <p>${getFullTitle()}</p>
    <p>You received this email because you're a registered partner.</p>
  </div>
</body>
</html>
`

  return html
}

function generateDigestText(name: string, content: DigestContent): string {
  let text = `${getFullTitle()} - Weekly Update\n\n`
  text += `Hi ${name},\n\n`
  text += `Here's what's new this week:\n\n`

  if (content.newAssets.length > 0) {
    text += `NEW SALES MATERIALS\n`
    text += `-`.repeat(30) + `\n`
    for (const asset of content.newAssets) {
      text += `- ${asset.title} (${asset.type})\n`
    }
    text += `\n`
  }

  if (content.newDocsUpdates.length > 0) {
    text += `DOCUMENTATION UPDATES\n`
    text += `-`.repeat(30) + `\n`
    for (const doc of content.newDocsUpdates) {
      text += `- ${doc.title}\n`
    }
    text += `\n`
  }

  if (content.newProductUpdates.length > 0) {
    text += `PRODUCT UPDATES\n`
    text += `-`.repeat(30) + `\n`
    for (const update of content.newProductUpdates) {
      const label = update.updateType === "release_note" ? "Release" : "Coming Soon"
      text += `- ${update.title} (${label})\n`
    }
    text += `\n`
  }

  text += `\nVisit the portal: ${APP_URL}\n\n`
  text += `---\n${getFullTitle()}\n`

  return text
}
