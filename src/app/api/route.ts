import { handle } from 'hono/vercel'
import app from '@/backend'

export const GET = handle(app)
export const POST = handle(app)