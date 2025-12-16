import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { datasourceGroupsQuerySchema } from '../params'
import { protectedRoute } from '@/backend/middleware/auth'
import {
    listDatasourceGroups,
    getDatasourceGroupById,
    createDatasourceGroup,
    updateDatasourceGroup,
    deleteDatasourceGroup,
    datasourceGroupExists,
} from './service'

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
            const params = c.req.valid('query')
            const result = await listDatasourceGroups(params)
            return c.json(result)
        } catch (error) {
            console.error('Error fetching datasource groups:', error)
            return c.json({ error: 'Failed to fetch datasource groups' }, 500)
        }
    })

    // Create a new datasource group
    .post('/', zValidator('json', createDatasourceGroupSchema), async (c) => {
        try {
            const data = c.req.valid('json')
            const newGroup = await createDatasourceGroup(data)
            return c.json({ data: newGroup }, 201)
        } catch (error) {
            console.error('Error creating datasource group:', error)
            return c.json({ error: 'Failed to create datasource group' }, 500)
        }
    })

    // Get a single datasource group by ID
    .get('/:id', zValidator('param', idParamSchema), async (c) => {
        try {
            const { id } = c.req.valid('param')
            const group = await getDatasourceGroupById(id)

            if (!group) {
                return c.json({ error: 'Datasource group not found' }, 404)
            }

            return c.json({ data: group })
        } catch (error) {
            console.error('Error fetching datasource group:', error)
            return c.json({ error: 'Failed to fetch datasource group' }, 500)
        }
    })

    // Update a datasource group
    .patch('/:id', zValidator('param', idParamSchema), zValidator('json', updateDatasourceGroupSchema), async (c) => {
        try {
            const { id } = c.req.valid('param')
            const data = c.req.valid('json')

            // Check if datasource group exists
            if (!await datasourceGroupExists(id)) {
                return c.json({ error: 'Datasource group not found' }, 404)
            }

            const updatedGroup = await updateDatasourceGroup(id, data)
            return c.json({ data: updatedGroup })
        } catch (error) {
            console.error('Error updating datasource group:', error)
            return c.json({ error: 'Failed to update datasource group' }, 500)
        }
    })

    // Delete a datasource group
    .delete('/:id', zValidator('param', idParamSchema), async (c) => {
        try {
            const { id } = c.req.valid('param')

            // Check if datasource group exists
            if (!await datasourceGroupExists(id)) {
                return c.json({ error: 'Datasource group not found' }, 404)
            }

            await deleteDatasourceGroup(id)
            return c.json({ message: 'Datasource group deleted successfully' })
        } catch (error) {
            console.error('Error deleting datasource group:', error)
            return c.json({ error: 'Failed to delete datasource group' }, 500)
        }
    })
