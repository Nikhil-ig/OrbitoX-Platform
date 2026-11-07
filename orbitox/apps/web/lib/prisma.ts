import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as typeof globalThis & { prisma?: PrismaClient };

const isProduction = process.env.NODE_ENV === 'production';
if (isProduction && !process.env.APP_DATABASE_URL) {
  throw new Error('APP_DATABASE_URL is required in production. Refusing fallback to owner connection (DATABASE_URL).');
}

const databaseUrl = isProduction ? process.env.APP_DATABASE_URL : (process.env.APP_DATABASE_URL || process.env.DATABASE_URL);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(databaseUrl ? { datasources: { db: { url: databaseUrl } } } : {}),
  });

if (!isProduction) globalForPrisma.prisma = prisma;
