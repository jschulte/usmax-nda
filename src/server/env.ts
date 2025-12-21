import { config } from 'dotenv';

// Load local overrides first, then fall back to .env
config({ path: '.env.local' });
config();
