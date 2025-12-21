import { Hono } from 'hono'
import { llmsRouter } from '@/features/llms/server/routers'
import { datasourceGroupsRouter } from '@/features/datasource-groups/server/routers'
import { datasourcesRouter } from '@/features/datasources/server/routers'
import { agentsRouter } from '@/features/agents/server/routers'
import { chatRouter } from '@/features/chat/server/routers'
import { cors } from 'hono/cors'

const corsOrigin = (origin: string) => {
    // Allow localhost with any port
    if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) {
        return origin
    }
    // Allow same subdomain (e.g., *.jsclub.dev)
    if (/^https?:\/\/([a-z0-9-]+\.)*jsclub\.dev$/.test(origin)) {
        return origin
    }
    return null
}

const app = new Hono().basePath('/api')
    .use('/api/*', cors({
        origin: corsOrigin,
        credentials: true,
    }))
    .route('/llms', llmsRouter)
    .route('/datasource-groups', datasourceGroupsRouter)
    .route('/datasources', datasourcesRouter)
    .route('/agents', agentsRouter)
    .route('/chat', chatRouter)

export default app
export type AppType = typeof app