/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',

  // Compression
  compress: true,

  // Disable source maps in production for smaller build
  productionBrowserSourceMaps: false,

  // Image optimization
  images: {
    remotePatterns: [
      // AWS S3 buckets
      {
        protocol: 'https',
        hostname: '*.s3.*.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: 's3.*.amazonaws.com',
      },
      // YouTube thumbnails
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
      },
      // LinkedIn profile photos
      {
        protocol: 'https',
        hostname: 'media.licdn.com',
      },
      // Cloudinary (for logo hosting)
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      // Imgur (alternative logo hosting)
      {
        protocol: 'https',
        hostname: 'i.imgur.com',
      },
    ],
    // Modern image formats for better compression
    formats: ['image/avif', 'image/webp'],
    // Responsive image sizes
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  },

  // Security and caching headers
  async headers() {
    return [
      {
        // Security headers for all routes
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
      {
        // Cache static assets for 1 year
        source: '/:path*.(ico|png|jpg|jpeg|svg|gif|webp|avif)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Authenticated API routes - no caching (responses vary per user/session)
        source: '/api/portal/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'private, no-cache, no-store, must-revalidate',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
