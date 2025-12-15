import { createMiddleware } from 'hono/factory'
import { createAuth } from '@/lib/auth'

/**
 * Middleware to protect routes requiring authentication
 * Similar to tRPC's protectedProcedure
 */
export const protectedRoute = createMiddleware(async (c, next) => {
    const auth = await createAuth()
    const session = await auth.api.getSession({
        headers: c.req.raw.headers,
    })

    if (!session) {
        return c.json(
            {
                error: 'Unauthorized',
                message: 'User is not authenticated',
            },
            401
        )
    }

    // Add session to context for use in route handlers
    c.set('session', session)

    await next()
})

/**
 * Type helper to access session from context
 * Usage in route handlers: const session = c.get('session')
 * 
 * Note: session is guaranteed to be non-null in protected routes
 * because the middleware returns 401 if session is null
 */
declare module 'hono' {
    interface ContextVariableMap {
        session: NonNullable<Awaited<ReturnType<Awaited<ReturnType<typeof createAuth>>['api']['getSession']>>>
    }
}
