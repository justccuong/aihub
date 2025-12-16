import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { llmsQuerySchema } from '../params'
import { protectedRoute } from '@/backend/middleware/auth'
import {
    listLlms,
    getLlmById,
    createLlm,
    updateLlm,
    deleteLlm,
    llmExists,
} from './service'
import { invalidateAgentCachesByLlmId } from '@/features/agents/server/service'
import { AI_PROVIDER_SLUGS } from '@/config/constants'

// Validation schemas
export const createLlmSchema = z.object({
    name: z.string().min(1, 'Name is required').max(255),
    description: z.string().default('').optional(),
    provider: z.enum(AI_PROVIDER_SLUGS, { message: 'Invalid provider' }),
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
            const params = c.req.valid('query')
            const result = await listLlms(params)
            return c.json(result)
        } catch (error) {
            console.error('Error fetching LLMs:', error)
            return c.json({ error: 'Failed to fetch LLMs' }, 500)
        }
    })

    // Create a new LLM
    .post('/', zValidator('json', createLlmSchema), async (c) => {
        try {
            const data = c.req.valid('json')
            const newLlm = await createLlm(data)
            return c.json({ data: newLlm }, 201)
        } catch (error) {
            console.error('Error creating LLM:', error)
            return c.json({ error: 'Failed to create LLM' }, 500)
        }
    })

    // Get a single LLM by ID
    .get('/:id', zValidator('param', idParamSchema), async (c) => {
        try {
            const { id } = c.req.valid('param')
            const llm = await getLlmById(id)

            if (!llm) {
                return c.json({ error: 'LLM not found' }, 404)
            }

            return c.json({ data: llm })
        } catch (error) {
            console.error('Error fetching LLM:', error)
            return c.json({ error: 'Failed to fetch LLM' }, 500)
        }
    })

    // Update an LLM
    .patch('/:id', zValidator('param', idParamSchema), zValidator('json', updateLlmSchema), async (c) => {
        try {
            const { id } = c.req.valid('param')
            const data = c.req.valid('json')

            // Check if LLM exists
            if (!await llmExists(id)) {
                return c.json({ error: 'LLM not found' }, 404)
            }

            const updatedLlm = await updateLlm(id, data)

            // Invalidate KV cache for agents using this LLM
            await invalidateAgentCachesByLlmId(id)

            return c.json({ data: updatedLlm })
        } catch (error) {
            console.error('Error updating LLM:', error)
            return c.json({ error: 'Failed to update LLM' }, 500)
        }
    })

    // Delete an LLM
    .delete('/:id', zValidator('param', idParamSchema), async (c) => {
        try {
            const { id } = c.req.valid('param')

            // Check if LLM exists
            if (!await llmExists(id)) {
                return c.json({ error: 'LLM not found' }, 404)
            }

            // Invalidate KV cache for agents using this LLM before delete
            await invalidateAgentCachesByLlmId(id)

            await deleteLlm(id)
            return c.json({ message: 'LLM deleted successfully' })
        } catch (error) {
            console.error('Error deleting LLM:', error)
            return c.json({ error: 'Failed to delete LLM' }, 500)
        }
    })