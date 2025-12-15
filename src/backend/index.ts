import { Hono } from 'hono'
import { llmsRouter } from '@/features/llms/server/routers'

const app = new Hono().basePath('/api')
    .route('/llms', llmsRouter)

export default app
export type AppType = typeof app