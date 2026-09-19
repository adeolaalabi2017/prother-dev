import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Recreate the singleton when the generated Prisma Client is older than the
 * schema (e.g. after `db:push` adds a model in a long-running dev server —
 * the globalThis cache would otherwise keep serving a stale client).
 */
export const db =
  globalForPrisma.prisma && 'submission' in globalForPrisma.prisma
    ? globalForPrisma.prisma
    : (globalForPrisma.prisma = new PrismaClient({
        log: ['query'],
      }))
// regenerated-client reload marker 1789855660
