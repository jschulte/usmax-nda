import { config } from 'dotenv';
import { Client } from 'pg';
import { execSync } from 'node:child_process';

export default async function globalSetup() {
  config({ path: '.env.test.local' });
  config({ path: '.env.local' });

  const testDatabaseUrl = process.env.DATABASE_URL_TEST;
  if (!testDatabaseUrl) {
    throw new Error('DATABASE_URL_TEST must be set for tests (see .env.test.local)');
  }

  process.env.SHADOW_DATABASE_URL = process.env.SHADOW_DATABASE_URL || testDatabaseUrl;

  const url = new URL(testDatabaseUrl);
  const dbName = url.pathname.replace('/', '');
  if (!dbName) {
    throw new Error('DATABASE_URL_TEST must include a database name');
  }

  const shadowDbName = `${dbName}_shadow`;
  const shadowUrl = new URL(testDatabaseUrl);
  shadowUrl.pathname = `/${shadowDbName}`;
  process.env.SHADOW_DATABASE_URL = process.env.SHADOW_DATABASE_URL || shadowUrl.toString();

  const adminUrl = new URL(testDatabaseUrl);
  adminUrl.pathname = '/postgres';

  const client = new Client({ connectionString: adminUrl.toString() });
  await client.connect();

  const ensureDatabase = async (name: string) => {
    const exists = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [name]);
    if (exists.rowCount === 0) {
      await client.query(`CREATE DATABASE "${name}"`);
    }
  };

  await ensureDatabase(dbName);
  await ensureDatabase(shadowDbName);

  await client.end();

  execSync('pnpm prisma migrate deploy', {
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: testDatabaseUrl,
      SHADOW_DATABASE_URL: process.env.SHADOW_DATABASE_URL,
    },
  });
}
