/**
 * Screenshot capture service using Screenshotbase API
 * https://screenshotbase.com/docs
 */

interface ScreenshotOptions {
  url: string
  width?: number
  height?: number
  format?: "png" | "jpg" | "webp"
  fullPage?: boolean
}

interface ScreenshotResult {
  screenshotUrl: string
  success: boolean
}

const SCREENSHOTBASE_KEY = process.env.SCREENSHOTBASE_KEY || ""

/**
 * Capture a screenshot of a URL using Screenshotbase
 * Returns a URL that can be used to download the screenshot
 */
export async function captureScreenshot(
  options: ScreenshotOptions
): Promise<ScreenshotResult> {
  if (!SCREENSHOTBASE_KEY) {
    throw new Error("SCREENSHOTBASE_KEY environment variable not set")
  }

  const params = new URLSearchParams({
    url: options.url,
    viewport_width: String(options.width || 1200),
    viewport_height: String(options.height || 900),
    format: options.format || "png",
    full_page: options.fullPage ? "1" : "0",
    block_cookie_banners: "1",
    block_ads: "1",
  })

  // Build the URL - we'll use this for downloading directly
  const screenshotUrl = `https://api.screenshotbase.com/v1/take?${params.toString()}`

  return {
    screenshotUrl,
    success: true,
  }
}

/**
 * Download a screenshot image from Screenshotbase
 */
export async function downloadScreenshot(url: string): Promise<Buffer> {
  if (!SCREENSHOTBASE_KEY) {
    throw new Error("SCREENSHOTBASE_KEY environment variable not set")
  }

  // Add timeout to prevent hanging
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 60000) // 60 second timeout

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'apikey': SCREENSHOTBASE_KEY,
      }
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Screenshot API failed: ${response.status} - ${errorText}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Screenshot download timed out after 60 seconds')
    }
    throw error
  }
}
