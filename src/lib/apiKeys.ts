import crypto from "crypto"
import { prisma } from "@/lib/prisma"
import type { ApiKey } from "@prisma/client"

/**
 * API key issuance, hashing, and verification.
 *
 * Format: `colect_pk_<8-char prefix><24-char secret>` — the literal prefix
 * `colect_pk_` makes leaked keys trivially greppable in code/logs/CI. The
 * 8-char `prefix` portion is non-secret and shown in lists for identification;
 * the secret portion contributes ~140 bits of entropy. Only the sha256 of the
 * FULL plaintext is persisted.
 */

const KEY_PREFIX_LITERAL = "colect_pk_"
const PREFIX_LEN = 8
const SECRET_LEN = 24
const ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

export const DEFAULT_KEY_TTL_DAYS = 90
export const MAX_ACTIVE_KEYS_PER_USER = 5

function randomChars(n: number): string {
  // Crypto-secure base62 via rejection sampling. We sample more bytes than
  // needed because each random byte has a small bias modulo 62 — discarding
  // values >= 62 * floor(256/62) keeps the distribution uniform.
  const cutoff = Math.floor(256 / ALPHABET.length) * ALPHABET.length
  let out = ""
  while (out.length < n) {
    const buf = crypto.randomBytes(n * 2)
    for (let i = 0; i < buf.length && out.length < n; i++) {
      if (buf[i] < cutoff) out += ALPHABET[buf[i] % ALPHABET.length]
    }
  }
  return out
}

export function hashKey(plaintext: string): string {
  return crypto.createHash("sha256").update(plaintext).digest("hex")
}

export interface IssuedKey {
  /** Shown to the user ONCE. Never persisted; never logged. */
  plaintext: string
  /** Persisted record (no secret). */
  record: ApiKey
}

/**
 * Mint a new ApiKey owned by the given user. The returned plaintext is the
 * user's only chance to copy the secret. Throws if the user already has the
 * max number of active (non-revoked, non-expired) keys.
 */
export async function issueKey(opts: {
  userId: string
  userDomain: string
  label: string
  ttlDays?: number | null // null = no expiry; undefined = use default
  /** Defaults to read-only. Callers must check the user may hold each scope. */
  scopes?: string[]
}): Promise<IssuedKey> {
  const now = new Date()
  const activeCount = await prisma.apiKey.count({
    where: {
      userId: opts.userId,
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
  })
  if (activeCount >= MAX_ACTIVE_KEYS_PER_USER) {
    throw new Error(
      `You already have ${activeCount} active API keys (limit ${MAX_ACTIVE_KEYS_PER_USER}). Revoke an unused one first.`
    )
  }

  const prefix = randomChars(PREFIX_LEN)
  const secret = randomChars(SECRET_LEN)
  const plaintext = `${KEY_PREFIX_LITERAL}${prefix}${secret}`
  const hashedKey = hashKey(plaintext)

  const ttlDays = opts.ttlDays === undefined ? DEFAULT_KEY_TTL_DAYS : opts.ttlDays
  const expiresAt = ttlDays && ttlDays > 0
    ? new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000)
    : null

  const label = (opts.label ?? "").trim() || "Unnamed key"

  const record = await prisma.apiKey.create({
    data: {
      hashedKey,
      prefix,
      label,
      userId: opts.userId,
      domain: opts.userDomain,
      scopes: opts.scopes ?? ["read:portal"],
      expiresAt,
    },
  })

  return { plaintext, record }
}

export function parseAuthorizationHeader(header: string | null): string | null {
  if (!header) return null
  const m = header.match(/^Bearer\s+(.+)$/i)
  return m ? m[1].trim() : null
}

/** Resolve a plaintext key to its ApiKey row, or null if invalid/revoked/expired. */
export async function findActiveKeyByPlaintext(plaintext: string): Promise<ApiKey | null> {
  if (!plaintext.startsWith(KEY_PREFIX_LITERAL)) return null
  const hashedKey = hashKey(plaintext)
  const record = await prisma.apiKey.findUnique({ where: { hashedKey } })
  if (!record) return null
  if (record.revokedAt) return null
  if (record.expiresAt && record.expiresAt.getTime() < Date.now()) return null
  return record
}

export function maskKeyForDisplay(prefix: string): string {
  return `${KEY_PREFIX_LITERAL}${prefix}…`
}

export { KEY_PREFIX_LITERAL }
