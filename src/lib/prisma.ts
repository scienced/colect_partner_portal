import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Configure connection pool: 10 connections, 20s timeout
// Suitable for a single always-running instance (Digital Ocean App Platform)
function buildDatabaseUrl(): string {
  const baseUrl = process.env.DATABASE_URL || ''
  const separator = baseUrl.includes('?') ? '&' : '?'
  return `${baseUrl}${separator}connection_limit=10&pool_timeout=20`
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  datasources: {
    db: { url: buildDatabaseUrl() },
  },
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma
