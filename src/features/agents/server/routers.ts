import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { getDb } from '@/lib/db'
import { agents, agentDatasourceGroups, datasourceGroups, llms } from '@/lib/schema'
import { eq, like, or, desc, asc, sql, inArray } from 'drizzle-orm'
import { agentsQuerySchema } from '../params'
import { protectedRoute } from '@/backend/middleware/auth'

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
            const db = await getDb()
            const { page, pageSize, search, sortBy, sortOrder } = c.req.valid('query')

            const offset = (page - 1) * pageSize

            // Build where clause for search
            const whereConditions = search
                ? or(
                    like(agents.name, `%${search}%`),
                    like(agents.description, `%${search}%`),
                    like(agents.systemPrompt, `%${search}%`)
                )
                : undefined

            // Determine sort column
            const sortColumn = {
                name: agents.name,
                createdAt: agents.createdAt,
                updatedAt: agents.updatedAt,
            }[sortBy]

            // Get total count
            const totalResult = await db
                .select({ count: sql<number>`count(*)` })
                .from(agents)
                .where(whereConditions)

            const total = totalResult[0]?.count || 0

            // Get paginated data with LLM info
            const data = await db
                .select({
                    id: agents.id,
                    name: agents.name,
                    description: agents.description,
                    systemPrompt: agents.systemPrompt,
                    topK: agents.topK,
                    temperature: agents.temperature,
                    maxTokens: agents.maxTokens,
                    llmId: agents.llmId,
                    createdAt: agents.createdAt,
                    updatedAt: agents.updatedAt,
                    llmName: llms.name,
                })
                .from(agents)
                .leftJoin(llms, eq(agents.llmId, llms.id))
                .where(whereConditions)
                .orderBy(sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn))
                .limit(pageSize)
                .offset(offset)

            // Get datasource groups for each agent
            const agentIds = data.map(a => a.id)
            let datasourceGroupsMap: Record<number, { id: number; name: string }[]> = {}

            if (agentIds.length > 0) {
                const agentGroups = await db
                    .select({
                        agentId: agentDatasourceGroups.agentId,
                        groupId: datasourceGroups.id,
                        groupName: datasourceGroups.name,
                    })
                    .from(agentDatasourceGroups)
                    .innerJoin(datasourceGroups, eq(agentDatasourceGroups.datasourceGroupId, datasourceGroups.id))
                    .where(inArray(agentDatasourceGroups.agentId, agentIds))

                for (const ag of agentGroups) {
                    if (!datasourceGroupsMap[ag.agentId]) {
                        datasourceGroupsMap[ag.agentId] = []
                    }
                    datasourceGroupsMap[ag.agentId].push({ id: ag.groupId, name: ag.groupName })
                }
            }

            const enrichedData = data.map(agent => ({
                ...agent,
                datasourceGroups: datasourceGroupsMap[agent.id] || [],
            }))

            return c.json({
                data: enrichedData,
                pagination: {
                    page,
                    pageSize,
                    total,
                    totalPages: Math.ceil(total / pageSize),
                },
            })
        } catch (error) {
            console.error('Error fetching agents:', error)
            return c.json({ error: 'Failed to fetch agents' }, 500)
        }
    })

    // Create a new agent
    .post('/', zValidator('json', createAgentSchema), async (c) => {
        try {
            const db = await getDb()
            const { datasourceGroupIds, ...agentData } = c.req.valid('json')

            // Create agent
            const result = await db.insert(agents).values(agentData).returning()
            const newAgent = result[0]

            // Create datasource group associations
            if (datasourceGroupIds && datasourceGroupIds.length > 0) {
                await db.insert(agentDatasourceGroups).values(
                    datasourceGroupIds.map(groupId => ({
                        agentId: newAgent.id,
                        datasourceGroupId: groupId,
                    }))
                )
            }

            return c.json({ data: newAgent }, 201)
        } catch (error) {
            console.error('Error creating agent:', error)
            return c.json({ error: 'Failed to create agent' }, 500)
        }
    })

    // Get a single agent by ID
    .get('/:id', zValidator('param', idParamSchema), async (c) => {
        try {
            const db = await getDb()
            const { id } = c.req.valid('param')

            const result = await db
                .select({
                    id: agents.id,
                    name: agents.name,
                    description: agents.description,
                    systemPrompt: agents.systemPrompt,
                    topK: agents.topK,
                    temperature: agents.temperature,
                    maxTokens: agents.maxTokens,
                    llmId: agents.llmId,
                    createdAt: agents.createdAt,
                    updatedAt: agents.updatedAt,
                    llmName: llms.name,
                })
                .from(agents)
                .leftJoin(llms, eq(agents.llmId, llms.id))
                .where(eq(agents.id, id))
                .limit(1)

            if (!result[0]) {
                return c.json({ error: 'Agent not found' }, 404)
            }

            // Get datasource groups
            const agentGroups = await db
                .select({
                    groupId: datasourceGroups.id,
                    groupName: datasourceGroups.name,
                })
                .from(agentDatasourceGroups)
                .innerJoin(datasourceGroups, eq(agentDatasourceGroups.datasourceGroupId, datasourceGroups.id))
                .where(eq(agentDatasourceGroups.agentId, id))

            return c.json({
                data: {
                    ...result[0],
                    datasourceGroups: agentGroups.map(g => ({ id: g.groupId, name: g.groupName })),
                }
            })
        } catch (error) {
            console.error('Error fetching agent:', error)
            return c.json({ error: 'Failed to fetch agent' }, 500)
        }
    })

    // Update an agent
    .patch('/:id', zValidator('param', idParamSchema), zValidator('json', updateAgentSchema), async (c) => {
        try {
            const db = await getDb()
            const { id } = c.req.valid('param')
            const { datasourceGroupIds, ...agentData } = c.req.valid('json')

            // Check if agent exists
            const existing = await db
                .select()
                .from(agents)
                .where(eq(agents.id, id))
                .limit(1)

            if (!existing[0]) {
                return c.json({ error: 'Agent not found' }, 404)
            }

            // Update agent fields
            const result = await db
                .update(agents)
                .set({ ...agentData, updatedAt: new Date() })
                .where(eq(agents.id, id))
                .returning()

            // Update datasource group associations if provided
            if (datasourceGroupIds !== undefined) {
                // Remove existing associations
                await db.delete(agentDatasourceGroups).where(eq(agentDatasourceGroups.agentId, id))

                // Add new associations
                if (datasourceGroupIds.length > 0) {
                    await db.insert(agentDatasourceGroups).values(
                        datasourceGroupIds.map(groupId => ({
                            agentId: id,
                            datasourceGroupId: groupId,
                        }))
                    )
                }
            }

            return c.json({ data: result[0] })
        } catch (error) {
            console.error('Error updating agent:', error)
            return c.json({ error: 'Failed to update agent' }, 500)
        }
    })

    // Delete an agent
    .delete('/:id', zValidator('param', idParamSchema), async (c) => {
        try {
            const db = await getDb()
            const { id } = c.req.valid('param')

            // Check if agent exists
            const existing = await db
                .select()
                .from(agents)
                .where(eq(agents.id, id))
                .limit(1)

            if (!existing[0]) {
                return c.json({ error: 'Agent not found' }, 404)
            }

            // Delete agent (junction table entries cascade automatically)
            await db.delete(agents).where(eq(agents.id, id))

            return c.json({ message: 'Agent deleted successfully' })
        } catch (error) {
            console.error('Error deleting agent:', error)
            return c.json({ error: 'Failed to delete agent' }, 500)
        }
    })
