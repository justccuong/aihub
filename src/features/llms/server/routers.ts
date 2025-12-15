import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { getDb } from '@/lib/db'
import { llms } from '@/lib/schema'
import { eq, like, or, desc, asc, sql } from 'drizzle-orm'
import { llmsQuerySchema } from '../params'
import { protectedRoute } from '@/backend/middleware/auth'

// Validation schemas
const createLlmSchema = z.object({
    name: z.string().min(1, 'Name is required').max(255),
    description: z.string().default('').optional(),
    provider: z.string().min(1, 'Provider is required').max(100),
    model: z.string().min(1, 'Model is required').max(255),
    baseUrl: z.url('Must be a valid URL'),
    apiKey: z.string().min(1, 'API key is required'),
})

const updateLlmSchema = createLlmSchema.partial()

const idParamSchema = z.object({
    id: z.coerce.number().int().positive(),
})

export const llmsRouter = new Hono()
    // Apply protected middleware to all routes
    .use('*', protectedRoute)

    // List all LLMs with pagination and search
    .get('/', zValidator('query', llmsQuerySchema), async (c) => {
        try {
            const db = await getDb()
            const { page, pageSize, search, sortBy, sortOrder } = c.req.valid('query')

            const offset = (page - 1) * pageSize

            // Build where clause for search
            const whereConditions = search
                ? or(
                    like(llms.name, `%${search}%`),
                    like(llms.provider, `%${search}%`),
                    like(llms.model, `%${search}%`),
                    like(llms.description, `%${search}%`)
                )
                : undefined

            // Determine sort column
            const sortColumn = {
                name: llms.name,
                provider: llms.provider,
                createdAt: llms.createdAt,
                updatedAt: llms.updatedAt,
            }[sortBy]

            // Get total count
            const totalResult = await db
                .select({ count: sql<number>`count(*)` })
                .from(llms)
                .where(whereConditions)

            const total = totalResult[0]?.count || 0

            // Get paginated data
            const data = await db
                .select()
                .from(llms)
                .where(whereConditions)
                .orderBy(sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn))
                .limit(pageSize)
                .offset(offset)

            return c.json({
                data,
                pagination: {
                    page,
                    pageSize,
                    total,
                    totalPages: Math.ceil(total / pageSize),
                },
            })
        } catch (error) {
            console.error('Error fetching LLMs:', error)
            return c.json({ error: 'Failed to fetch LLMs' }, 500)
        }
    })

    // Create a new LLM
    .post('/', zValidator('json', createLlmSchema), async (c) => {
        try {
            const db = await getDb()
            const data = c.req.valid('json')

            const result = await db.insert(llms).values(data).returning()

            return c.json({ data: result[0] }, 201)
        } catch (error) {
            console.error('Error creating LLM:', error)
            return c.json({ error: 'Failed to create LLM' }, 500)
        }
    })

    // Get a single LLM by ID
    .get('/:id', zValidator('param', idParamSchema), async (c) => {
        try {
            const db = await getDb()
            const { id } = c.req.valid('param')

            const result = await db
                .select()
                .from(llms)
                .where(eq(llms.id, id))
                .limit(1)

            if (!result[0]) {
                return c.json({ error: 'LLM not found' }, 404)
            }

            return c.json({ data: result[0] })
        } catch (error) {
            console.error('Error fetching LLM:', error)
            return c.json({ error: 'Failed to fetch LLM' }, 500)
        }
    })

    // Update an LLM
    .patch('/:id', zValidator('param', idParamSchema), zValidator('json', updateLlmSchema), async (c) => {
        try {
            const db = await getDb()
            const { id } = c.req.valid('param')
            const data = c.req.valid('json')

            // Check if LLM exists
            const existing = await db
                .select()
                .from(llms)
                .where(eq(llms.id, id))
                .limit(1)

            if (!existing[0]) {
                return c.json({ error: 'LLM not found' }, 404)
            }

            const result = await db
                .update(llms)
                .set({ ...data, updatedAt: new Date() })
                .where(eq(llms.id, id))
                .returning()

            return c.json({ data: result[0] })
        } catch (error) {
            console.error('Error updating LLM:', error)
            return c.json({ error: 'Failed to update LLM' }, 500)
        }
    })

    // Delete an LLM
    .delete('/:id', zValidator('param', idParamSchema), async (c) => {
        try {
            const db = await getDb()
            const { id } = c.req.valid('param')

            // Check if LLM exists
            const existing = await db
                .select()
                .from(llms)
                .where(eq(llms.id, id))
                .limit(1)

            if (!existing[0]) {
                return c.json({ error: 'LLM not found' }, 404)
            }

            await db.delete(llms).where(eq(llms.id, id))

            return c.json({ message: 'LLM deleted successfully' })
        } catch (error) {
            console.error('Error deleting LLM:', error)
            return c.json({ error: 'Failed to delete LLM' }, 500)
        }
    })