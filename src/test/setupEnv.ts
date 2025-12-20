import { config } from 'dotenv';

// Prefer test-specific env, then fall back to local dev
config({ path: '.env.test.local' });
config({ path: '.env.local' });

const testDatabaseUrl = process.env.DATABASE_URL_TEST;
if (!testDatabaseUrl) {
  throw new Error('DATABASE_URL_TEST must be set for tests (see .env.test.local)');
}

process.env.DATABASE_URL = testDatabaseUrl;
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.USE_MOCK_AUTH = process.env.USE_MOCK_AUTH || 'true';
process.env.COOKIE_SECURE = process.env.COOKIE_SECURE || 'false';

// Ensure Prisma client uses the test database for each run
const globalAny = globalThis as typeof globalThis & { __prisma?: unknown; __pgPool?: unknown };
globalAny.__prisma = undefined;
globalAny.__pgPool = undefined;
