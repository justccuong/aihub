import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { datasourcesQuerySchema } from '../params'
import { protectedRoute } from '@/backend/middleware/auth'
import { upsertVector, deleteVector } from '@/lib/vectorize'
import {
    listDatasourcesByGroup,
    getDatasourceById,
    createDatasource,
    updateDatasource,
    deleteDatasource,
    datasourceExists,
} from './service'

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
            const { groupId } = c.req.valid('param')
            const queryParams = c.req.valid('query')
            const result = await listDatasourcesByGroup({ groupId, ...queryParams })
            return c.json(result)
        } catch (error) {
            console.error('Error fetching datasources:', error)
            return c.json({ error: 'Failed to fetch datasources' }, 500)
        }
    })

    // Create a new datasource with vector embedding
    .post('/', zValidator('json', createDatasourceSchema), async (c) => {
        try {
            const data = c.req.valid('json')
            const newDatasource = await createDatasource(data)

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
            const { id } = c.req.valid('param')
            const datasource = await getDatasourceById(id)

            if (!datasource) {
                return c.json({ error: 'Datasource not found' }, 404)
            }

            return c.json({ data: datasource })
        } catch (error) {
            console.error('Error fetching datasource:', error)
            return c.json({ error: 'Failed to fetch datasource' }, 500)
        }
    })

    // Update a datasource with vector embedding update
    .patch('/:id', zValidator('param', idParamSchema), zValidator('json', updateDatasourceSchema), async (c) => {
        try {
            const { id } = c.req.valid('param')
            const data = c.req.valid('json')

            // Check if datasource exists
            const existing = await datasourceExists(id)
            if (!existing) {
                return c.json({ error: 'Datasource not found' }, 404)
            }

            const updatedDatasource = await updateDatasource(id, data)

            // Update vector embedding if content changed
            if (data.content && existing.datasourceGroupId) {
                try {
                    await upsertVector(
                        updatedDatasource.id,
                        existing.datasourceGroupId,
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
            const { id } = c.req.valid('param')

            // Check if datasource exists
            if (!await datasourceExists(id)) {
                return c.json({ error: 'Datasource not found' }, 404)
            }

            await deleteDatasource(id)

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
