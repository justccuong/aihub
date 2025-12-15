import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { getDb } from '@/lib/db'
import { datasources, datasourceGroups } from '@/lib/schema'
import { eq, like, desc, asc, sql, and } from 'drizzle-orm'
import { datasourcesQuerySchema } from '../params'
import { protectedRoute } from '@/backend/middleware/auth'
import { upsertVector, deleteVector } from '@/lib/vectorize'

// Validation schemas
export const createDatasourceSchema = z.object({
    content: z.string().min(1, 'Content is required'),
    datasourceGroupId: z.number().int().positive(),
})

const updateDatasourceSchema = z.object({
    content: z.string().min(1, 'Content is required').optional(),
})

const idParamSchema = z.object({
    id: z.coerce.number().int().positive(),
})

const groupIdParamSchema = z.object({
    groupId: z.coerce.number().int().positive(),
})

export const datasourcesRouter = new Hono()
    // Apply protected middleware to all routes
    .use('*', protectedRoute)

    // List all datasources for a group with pagination and search
    .get('/group/:groupId', zValidator('param', groupIdParamSchema), zValidator('query', datasourcesQuerySchema), async (c) => {
        try {
            const db = await getDb()
            const { groupId } = c.req.valid('param')
            const { page, pageSize, search, sortOrder } = c.req.valid('query')

            const offset = (page - 1) * pageSize

            // Build where clause - always filter by group, optionally by search
            const baseCondition = eq(datasources.datasourceGroupId, groupId)
            const whereConditions = search
                ? and(baseCondition, like(datasources.content, `%${search}%`))
                : baseCondition

            // Get total count
            const totalResult = await db
                .select({ count: sql<number>`count(*)` })
                .from(datasources)
                .where(whereConditions)

            const total = totalResult[0]?.count || 0

            // Get paginated data
            const data = await db
                .select()
                .from(datasources)
                .where(whereConditions)
                .orderBy(sortOrder === 'asc' ? asc(datasources.id) : desc(datasources.id))
                .limit(pageSize)
                .offset(offset)

            // Get group info
            const groupInfo = await db
                .select()
                .from(datasourceGroups)
                .where(eq(datasourceGroups.id, groupId))
                .limit(1)

            return c.json({
                data,
                group: groupInfo[0] || null,
                pagination: {
                    page,
                    pageSize,
                    total,
                    totalPages: Math.ceil(total / pageSize),
                },
            })
        } catch (error) {
            console.error('Error fetching datasources:', error)
            return c.json({ error: 'Failed to fetch datasources' }, 500)
        }
    })

    // Create a new datasource with vector embedding
    .post('/', zValidator('json', createDatasourceSchema), async (c) => {
        try {
            const db = await getDb()
            const data = c.req.valid('json')

            // Insert datasource
            const result = await db.insert(datasources).values(data).returning()
            const newDatasource = result[0]

            // Create vector embedding
            try {
                await upsertVector(
                    newDatasource.id,
                    data.datasourceGroupId,
                    data.content
                )
            } catch (vectorError) {
                console.error('Error creating vector embedding:', vectorError)
                // Continue even if vector creation fails - data is still saved
            }

            return c.json({ data: newDatasource }, 201)
        } catch (error) {
            console.error('Error creating datasource:', error)
            return c.json({ error: 'Failed to create datasource' }, 500)
        }
    })

    // Get a single datasource by ID
    .get('/:id', zValidator('param', idParamSchema), async (c) => {
        try {
            const db = await getDb()
            const { id } = c.req.valid('param')

            const result = await db
                .select()
                .from(datasources)
                .where(eq(datasources.id, id))
                .limit(1)

            if (!result[0]) {
                return c.json({ error: 'Datasource not found' }, 404)
            }

            return c.json({ data: result[0] })
        } catch (error) {
            console.error('Error fetching datasource:', error)
            return c.json({ error: 'Failed to fetch datasource' }, 500)
        }
    })

    // Update a datasource with vector embedding update
    .patch('/:id', zValidator('param', idParamSchema), zValidator('json', updateDatasourceSchema), async (c) => {
        try {
            const db = await getDb()
            const { id } = c.req.valid('param')
            const data = c.req.valid('json')

            // Check if datasource exists
            const existing = await db
                .select()
                .from(datasources)
                .where(eq(datasources.id, id))
                .limit(1)

            if (!existing[0]) {
                return c.json({ error: 'Datasource not found' }, 404)
            }

            const result = await db
                .update(datasources)
                .set(data)
                .where(eq(datasources.id, id))
                .returning()

            const updatedDatasource = result[0]

            // Update vector embedding if content changed
            if (data.content && existing[0].datasourceGroupId) {
                try {
                    await upsertVector(
                        updatedDatasource.id,
                        existing[0].datasourceGroupId,
                        data.content
                    )
                } catch (vectorError) {
                    console.error('Error updating vector embedding:', vectorError)
                }
            }

            return c.json({ data: updatedDatasource })
        } catch (error) {
            console.error('Error updating datasource:', error)
            return c.json({ error: 'Failed to update datasource' }, 500)
        }
    })

    // Delete a datasource with vector deletion
    .delete('/:id', zValidator('param', idParamSchema), async (c) => {
        try {
            const db = await getDb()
            const { id } = c.req.valid('param')

            // Check if datasource exists
            const existing = await db
                .select()
                .from(datasources)
                .where(eq(datasources.id, id))
                .limit(1)

            if (!existing[0]) {
                return c.json({ error: 'Datasource not found' }, 404)
            }

            // Delete from database
            await db.delete(datasources).where(eq(datasources.id, id))

            // Delete vector embedding
            try {
                await deleteVector(id)
            } catch (vectorError) {
                console.error('Error deleting vector embedding:', vectorError)
            }

            return c.json({ message: 'Datasource deleted successfully' })
        } catch (error) {
            console.error('Error deleting datasource:', error)
            return c.json({ error: 'Failed to delete datasource' }, 500)
        }
    })
