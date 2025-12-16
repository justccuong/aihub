import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { agentsQuerySchema } from '../params'
import { protectedRoute } from '@/backend/middleware/auth'
import {
    listAgents,
    getAgentById,
    createAgent,
    updateAgent,
    deleteAgent,
    agentExists,
} from './service'

// Validation schemas
export const createAgentSchema = z.object({
    name: z.string().min(1, 'Name is required').max(255),
    description: z.string().default('').optional(),
    systemPrompt: z.string().default('').optional(),
    topK: z.coerce.number().int().min(1).max(100).default(40).optional(),
    temperature: z.coerce.number().int().min(0).max(100).default(70).optional(),
    maxTokens: z.coerce.number().int().min(1).max(32000).default(1024).optional(),
    llmId: z.coerce.number().int().positive().optional(),
    datasourceGroupIds: z.array(z.coerce.number().int().positive()).default([]).optional(),
})

const updateAgentSchema = createAgentSchema.partial()

const idParamSchema = z.object({
    id: z.coerce.number().int().positive(),
})

export const agentsRouter = new Hono()
    // Apply protected middleware to all routes
    .use('*', protectedRoute)

    // List all agents with pagination and search
    .get('/', zValidator('query', agentsQuerySchema), async (c) => {
        try {
            const params = c.req.valid('query')
            const result = await listAgents(params)
            return c.json(result)
        } catch (error) {
            console.error('Error fetching agents:', error)
            return c.json({ error: 'Failed to fetch agents' }, 500)
        }
    })

    // Create a new agent
    .post('/', zValidator('json', createAgentSchema), async (c) => {
        try {
            const { datasourceGroupIds, ...agentData } = c.req.valid('json')
            const newAgent = await createAgent(agentData, datasourceGroupIds)
            return c.json({ data: newAgent }, 201)
        } catch (error) {
            console.error('Error creating agent:', error)
            return c.json({ error: 'Failed to create agent' }, 500)
        }
    })

    // Get a single agent by ID
    .get('/:id', zValidator('param', idParamSchema), async (c) => {
        try {
            const { id } = c.req.valid('param')
            const agent = await getAgentById(id)

            if (!agent) {
                return c.json({ error: 'Agent not found' }, 404)
            }

            return c.json({ data: agent })
        } catch (error) {
            console.error('Error fetching agent:', error)
            return c.json({ error: 'Failed to fetch agent' }, 500)
        }
    })

    // Update an agent
    .patch('/:id', zValidator('param', idParamSchema), zValidator('json', updateAgentSchema), async (c) => {
        try {
            const { id } = c.req.valid('param')
            const { datasourceGroupIds, ...agentData } = c.req.valid('json')

            // Check if agent exists
            if (!await agentExists(id)) {
                return c.json({ error: 'Agent not found' }, 404)
            }

            const updatedAgent = await updateAgent(id, agentData, datasourceGroupIds)
            return c.json({ data: updatedAgent })
        } catch (error) {
            console.error('Error updating agent:', error)
            return c.json({ error: 'Failed to update agent' }, 500)
        }
    })

    // Delete an agent
    .delete('/:id', zValidator('param', idParamSchema), async (c) => {
        try {
            const { id } = c.req.valid('param')

            // Check if agent exists
            if (!await agentExists(id)) {
                return c.json({ error: 'Agent not found' }, 404)
            }

            await deleteAgent(id)
            return c.json({ message: 'Agent deleted successfully' })
        } catch (error) {
            console.error('Error deleting agent:', error)
            return c.json({ error: 'Failed to delete agent' }, 500)
        }
    })
