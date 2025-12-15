import { defineConfig } from 'drizzle-kit';

export default defineConfig({
    out: './drizzle/migrations',
    schema: './src/lib/schema.ts',
    dialect: 'sqlite',
});
