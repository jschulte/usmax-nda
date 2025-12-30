/**
 * Database Client Singleton
 * Story 1.2: JWT Middleware & User Context
 *
 * Provides a single Prisma client instance for the application.
 * In development, prevents multiple instances due to hot reloading.
 *
 * Uses @prisma/adapter-pg for Prisma 7+ compatibility.
 */

// CRITICAL: Load environment variables FIRST before checking DATABASE_URL
import { config } from 'dotenv';
config({ path: '.env.local' });
config(); // Also load .env as fallback

import { PrismaClient } from '../../generated/prisma/index.js';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const { Pool } = pg;

declare global {
  var __prisma: PrismaClient | undefined;
  var __pgPool: pg.Pool | undefined;
}

function createPrismaClient(): PrismaClient {
  // Create connection pool
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.warn('[Database] No DATABASE_URL configured, using mock mode');
    // Return a stub Prisma client that will fail gracefully
    // This allows the app to run without a database (mock auth mode)
    return new PrismaClient({
      adapter: new PrismaPg(new Pool({ connectionString: 'postgresql://mock:mock@localhost:5432/mock' })),
      log: ['error'],
    });
  }

  const pool = global.__pgPool || new Pool({ connectionString });

  if (process.env.NODE_ENV !== 'production') {
    global.__pgPool = pool;
  }

  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
}

// Prevent multiple instances during development hot reload
const prisma = global.__prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

export { prisma };
export default prisma;
