import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { drizzle } from 'drizzle-orm/d1';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import * as schema from '../schema';

/**
 * Create a Better Auth instance with D1 database from Cloudflare context
 */
export async function createAuth() {
    const { env } = await getCloudflareContext({ async: true });
    const db = drizzle(env.AIHUB_DB, { schema });

    return betterAuth({
        database: drizzleAdapter(db, {
            provider: 'sqlite',
            schema: {
                user: schema.user,
                session: schema.session,
                account: schema.account,
                verification: schema.verification,
            },
        }),
        emailAndPassword: {
            enabled: true,
            autoSignIn: true,
        },
        // Future: Add Google OAuth here
        // socialProviders: {
        //     google: {
        //         clientId: process.env.GOOGLE_CLIENT_ID!,
        //         clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        //     },
        // },
    });
}

// Type export for use elsewhere
export type Auth = ReturnType<typeof createAuth>;
