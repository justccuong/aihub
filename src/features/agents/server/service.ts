import { z } from 'zod'
import { getDb } from '@/lib/db'
import { agents, agentDatasourceGroups, datasourceGroups, llms } from '@/lib/schema'
import { eq, like, or, desc, asc, sql, inArray } from 'drizzle-orm'
import { agentsQuerySchema } from '../params'
import { createAgentSchema } from './routers'
import { getKV, putKV, deleteKV } from '@/lib/kv'

// Infer types from existing schemas (single source of truth)
export type ListAgentsParams = z.infer<typeof agentsQuerySchema>
export type CreateAgentInput = z.infer<typeof createAgentSchema>
export type AgentData = Omit<CreateAgentInput, 'datasourceGroupIds'>
export type UpdateAgentData = Partial<AgentData>

// Cache configuration
const CACHE_PREFIX = 'agent:'
const CACHE_TTL_SECONDS = 15 * 60 // 15 minutes

/**
 * Get cache key for agent by ID
 */
function getAgentCacheKey(id: number): string {
    return `${CACHE_PREFIX}${id}`
}

/**
 * Invalidate agent cache
 */
async function invalidateAgentCache(id: number): Promise<void> {
    const cacheKey = getAgentCacheKey(id)
    await deleteKV(cacheKey)
}

/**
 * Get datasource groups for multiple agents
 */
export async function getAgentDatasourceGroupsMap(agentIds: number[]) {
    if (agentIds.length === 0) return {}

    const db = await getDb()
    const agentGroups = await db
        .select({
            agentId: agentDatasourceGroups.agentId,
            groupId: datasourceGroups.id,
            groupName: datasourceGroups.name,
        })
        .from(agentDatasourceGroups)
        .innerJoin(datasourceGroups, eq(agentDatasourceGroups.datasourceGroupId, datasourceGroups.id))
        .where(inArray(agentDatasourceGroups.agentId, agentIds))

    const map: Record<number, { id: number; name: string }[]> = {}
    for (const ag of agentGroups) {
        if (!map[ag.agentId]) {
            map[ag.agentId] = []
        }
        map[ag.agentId].push({ id: ag.groupId, name: ag.groupName })
    }
    return map
}

/**
 * List agents with pagination and search
 */
export async function listAgents(params: ListAgentsParams) {
    const db = await getDb()
    const { page, pageSize, search, sortBy, sortOrder } = params
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
    const datasourceGroupsMap = await getAgentDatasourceGroupsMap(agentIds)

    const enrichedData = data.map(agent => ({
        ...agent,
        datasourceGroups: datasourceGroupsMap[agent.id] || [],
    }))

    return {
        data: enrichedData,
        pagination: {
            page,
            pageSize,
            total,
            totalPages: Math.ceil(total / pageSize),
        },
    }
}

/**
 * Fetch agent from database by ID (internal helper)
 */
async function fetchAgentFromDb(id: number) {
    const db = await getDb()

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

    if (!result[0]) return null

    // Get datasource groups
    const agentGroups = await db
        .select({
            groupId: datasourceGroups.id,
            groupName: datasourceGroups.name,
        })
        .from(agentDatasourceGroups)
        .innerJoin(datasourceGroups, eq(agentDatasourceGroups.datasourceGroupId, datasourceGroups.id))
        .where(eq(agentDatasourceGroups.agentId, id))

    return {
        ...result[0],
        datasourceGroups: agentGroups.map(g => ({ id: g.groupId, name: g.groupName })),
    }
}

/**
 * Get agent by ID with LLM and datasource groups (cached, 15 min TTL)
 */
export async function getAgentById(id: number) {
    const cacheKey = getAgentCacheKey(id)

    // Try to get from cache
    try {
        const cached = await getKV<ReturnType<typeof fetchAgentFromDb>>(cacheKey, 'json')
        if (cached) {
            return cached
        }
    } catch (error) {
        console.error('Error reading from cache:', error)
        // Continue to fetch from DB if cache fails
    }

    // Fetch from database
    const agent = await fetchAgentFromDb(id)

    // Cache the result (even null to prevent repeated DB queries for non-existent IDs)
    if (agent) {
        try {
            await putKV(cacheKey, JSON.stringify(agent), { expirationTtl: CACHE_TTL_SECONDS })
        } catch (error) {
            console.error('Error writing to cache:', error)
        }
    }

    return agent
}

/**
 * Create a new agent with optional datasource group associations
 */
export async function createAgent(data: AgentData, datasourceGroupIds?: number[]) {
    const db = await getDb()

    // Create agent
    const result = await db.insert(agents).values(data).returning()
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

    // No cache invalidation needed for create - new ID won't be in cache

    return newAgent
}

/**
 * Check if an agent exists
 */
export async function agentExists(id: number) {
    const db = await getDb()
    const existing = await db
        .select()
        .from(agents)
        .where(eq(agents.id, id))
        .limit(1)
    return !!existing[0]
}

/**
 * Update an agent with optional datasource group sync
 */
export async function updateAgent(id: number, data: UpdateAgentData, datasourceGroupIds?: number[]) {
    const db = await getDb()

    // Update agent fields
    const result = await db
        .update(agents)
        .set({ ...data, updatedAt: new Date() })
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

    // Invalidate cache after update
    await invalidateAgentCache(id)

    return result[0]
}

/**
 * Delete an agent (junction table entries cascade automatically)
 */
export async function deleteAgent(id: number) {
    const db = await getDb()
    await db.delete(agents).where(eq(agents.id, id))

    // Invalidate cache after delete
    await invalidateAgentCache(id)
}
