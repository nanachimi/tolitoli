import { defineConfig } from 'drizzle-kit';

// `npx drizzle-kit generate` writes the SQL migrations and the Expo migrations index.
export default defineConfig({
  dialect: 'sqlite',
  driver: 'expo',
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
});
