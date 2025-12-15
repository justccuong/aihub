import { Hono } from 'hono'
import { llmsRouter } from '@/features/llms/server/routers'
import { datasourceGroupsRouter } from '@/features/datasource-groups/server/routers'
import { datasourcesRouter } from '@/features/datasources/server/routers'

const app = new Hono().basePath('/api')
    .route('/llms', llmsRouter)
    .route('/datasource-groups', datasourceGroupsRouter)
    .route('/datasources', datasourcesRouter)

export default app
export type AppType = typeof app