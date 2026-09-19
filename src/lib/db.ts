import { PrismaClient } from '@prisma/client'

/**
 * Bump when a schema change (db:push) alters the generated client's shape.
 * A long-running `next dev` caches the PrismaClient on globalThis; without a
 * version check it would keep serving a stale instance that doesn't know new
 * models/fields. Editing this file also triggers a Turbopack module reload,
 * which re-evaluates the check and swaps in a fresh client.
 */
const SCHEMA_VERSION = 2 // v2: Submission model + Tool.submissionId column

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  prismaSchemaVersion: number | undefined
}

export const db =
  globalForPrisma.prisma &&
  globalForPrisma.prismaSchemaVersion === SCHEMA_VERSION &&
  'submission' in globalForPrisma.prisma
    ? globalForPrisma.prisma
    : (globalForPrisma.prismaSchemaVersion = SCHEMA_VERSION,
       (globalForPrisma.prisma = new PrismaClient({ log: ['query'] })))
