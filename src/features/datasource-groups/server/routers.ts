import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { getDb } from '@/lib/db'
import { datasourceGroups } from '@/lib/schema'
import { eq, like, or, desc, asc, sql } from 'drizzle-orm'
import { datasourceGroupsQuerySchema } from '../params'
import { protectedRoute } from '@/backend/middleware/auth'

// Validation schemas
export const createDatasourceGroupSchema = z.object({
    name: z.string().min(1, 'Name is required').max(255),
    description: z.string().default('').optional(),
})

const updateDatasourceGroupSchema = createDatasourceGroupSchema.partial()

const idParamSchema = z.object({
    id: z.coerce.number().int().positive(),
})

export const datasourceGroupsRouter = new Hono()
    // Apply protected middleware to all routes
    .use('*', protectedRoute)

    // List all datasource groups with pagination and search
    .get('/', zValidator('query', datasourceGroupsQuerySchema), async (c) => {
        try {
            const db = await getDb()
            const { page, pageSize, search, sortBy, sortOrder } = c.req.valid('query')

            const offset = (page - 1) * pageSize

            // Build where clause for search
            const whereConditions = search
                ? or(
                    like(datasourceGroups.name, `%${search}%`),
                    like(datasourceGroups.description, `%${search}%`)
                )
                : undefined

            // Determine sort column
            const sortColumnMap = {
                name: datasourceGroups.name,
                createdAt: datasourceGroups.createdAt,
                updatedAt: datasourceGroups.updatedAt,
            } as const
            const sortColumn = sortColumnMap[sortBy]

            // Get total count
            const totalResult = await db
                .select({ count: sql<number>`count(*)` })
                .from(datasourceGroups)
                .where(whereConditions)

            const total = totalResult[0]?.count || 0

            // Get paginated data
            const data = await db
                .select()
                .from(datasourceGroups)
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
            console.error('Error fetching datasource groups:', error)
            return c.json({ error: 'Failed to fetch datasource groups' }, 500)
        }
    })

    // Create a new datasource group
    .post('/', zValidator('json', createDatasourceGroupSchema), async (c) => {
        try {
            const db = await getDb()
            const data = c.req.valid('json')

            const result = await db.insert(datasourceGroups).values(data).returning()

            return c.json({ data: result[0] }, 201)
        } catch (error) {
            console.error('Error creating datasource group:', error)
            return c.json({ error: 'Failed to create datasource group' }, 500)
        }
    })

    // Get a single datasource group by ID
    .get('/:id', zValidator('param', idParamSchema), async (c) => {
        try {
            const db = await getDb()
            const { id } = c.req.valid('param')

            const result = await db
                .select()
                .from(datasourceGroups)
                .where(eq(datasourceGroups.id, id))
                .limit(1)

            if (!result[0]) {
                return c.json({ error: 'Datasource group not found' }, 404)
            }

            return c.json({ data: result[0] })
        } catch (error) {
            console.error('Error fetching datasource group:', error)
            return c.json({ error: 'Failed to fetch datasource group' }, 500)
        }
    })

    // Update a datasource group
    .patch('/:id', zValidator('param', idParamSchema), zValidator('json', updateDatasourceGroupSchema), async (c) => {
        try {
            const db = await getDb()
            const { id } = c.req.valid('param')
            const data = c.req.valid('json')

            // Check if datasource group exists
            const existing = await db
                .select()
                .from(datasourceGroups)
                .where(eq(datasourceGroups.id, id))
                .limit(1)

            if (!existing[0]) {
                return c.json({ error: 'Datasource group not found' }, 404)
            }

            const result = await db
                .update(datasourceGroups)
                .set({ ...data, updatedAt: new Date() })
                .where(eq(datasourceGroups.id, id))
                .returning()

            return c.json({ data: result[0] })
        } catch (error) {
            console.error('Error updating datasource group:', error)
            return c.json({ error: 'Failed to update datasource group' }, 500)
        }
    })

    // Delete a datasource group
    .delete('/:id', zValidator('param', idParamSchema), async (c) => {
        try {
            const db = await getDb()
            const { id } = c.req.valid('param')

            // Check if datasource group exists
            const existing = await db
                .select()
                .from(datasourceGroups)
                .where(eq(datasourceGroups.id, id))
                .limit(1)

            if (!existing[0]) {
                return c.json({ error: 'Datasource group not found' }, 404)
            }

            await db.delete(datasourceGroups).where(eq(datasourceGroups.id, id))

            return c.json({ message: 'Datasource group deleted successfully' })
        } catch (error) {
            console.error('Error deleting datasource group:', error)
            return c.json({ error: 'Failed to delete datasource group' }, 500)
        }
    })
