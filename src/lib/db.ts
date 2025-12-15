import { drizzle } from 'drizzle-orm/d1';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import * as schema from './schema';
import { getCloudflareContext } from '@opennextjs/cloudflare';

/**
 * Global DB instance cache for development mode
 * This prevents creating too many DB instances during hot reloads
 */
declare global {
    var __db: DrizzleD1Database<typeof schema> | undefined;
}

/**
 * Get or create a Drizzle DB instance (async)
 * @returns Drizzle DB instance with schema
 */
export async function getDb(): Promise<DrizzleD1Database<typeof schema>> {
    const { env } = await getCloudflareContext({ async: true });
    // In development, reuse the cached instance to avoid creating multiple connections during hot reload
    if (env.NEXTJS_ENV === 'development') {
        if (!global.__db) {
            global.__db = drizzle(env.AIHUB_DB, { schema });
        }
        return global.__db;
    }

    // In production, always create a new instance (no caching needed in serverless)
    return drizzle(env.AIHUB_DB, { schema });
}

/**
 * Type export for use in service layers
 */
export type DbType = DrizzleD1Database<typeof schema>;
