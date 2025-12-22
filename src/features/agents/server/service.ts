import { z } from 'zod'
import { getDb } from '@/lib/db'
import { agents, agentDatasourceGroups, datasourceGroups, llms } from '@/lib/schema'
import { eq, like, or, desc, asc, sql, inArray } from 'drizzle-orm'
import { agentsQuerySchema } from '../params'
import { createAgentSchema } from './routers'
import { getKV, putKV, deleteKV } from '@/lib/kv'
import { agentsLogger as logger } from '@/lib/logger'

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
export async function invalidateAgentCache(id: number): Promise<void> {
    logger.info('Invalidating agent cache', { agentId: id })
    const cacheKey = getAgentCacheKey(id)
    await deleteKV(cacheKey)
}

/**
 * Invalidate agent caches for all agents using a specific LLM
 */
export async function invalidateAgentCachesByLlmId(llmId: number): Promise<void> {
    logger.info('Invalidating agent caches by LLM ID', { llmId })
    const db = await getDb()

    // Find all agents using this LLM
    const agentsUsingLlm = await db
        .select({ id: agents.id })
        .from(agents)
        .where(eq(agents.llmId, llmId))

    logger.info('Found agents using LLM', { llmId, count: agentsUsingLlm.length })

    // Invalidate cache for each agent
    await Promise.all(
        agentsUsingLlm.map(agent => invalidateAgentCache(agent.id))
    )
}

/**
 * Invalidate agent caches for all agents using a specific datasource group
 */
export async function invalidateAgentCachesByDatasourceGroupId(datasourceGroupId: number): Promise<void> {
    logger.info('Invalidating agent caches by datasource group ID', { datasourceGroupId })
    const db = await getDb()

    // Find all agents using this datasource group
    const agentsUsingGroup = await db
        .select({ agentId: agentDatasourceGroups.agentId })
        .from(agentDatasourceGroups)
        .where(eq(agentDatasourceGroups.datasourceGroupId, datasourceGroupId))

    logger.info('Found agents using datasource group', { datasourceGroupId, count: agentsUsingGroup.length })

    // Invalidate cache for each agent
    await Promise.all(
        agentsUsingGroup.map(ag => invalidateAgentCache(ag.agentId))
    )
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
    logger.info('Listing agents', { page: params.page, pageSize: params.pageSize, search: params.search })
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
            isEnabled: agents.isEnabled,
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

    logger.info('Listed agents successfully', { total, page, pageSize })
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
 * Returns null if agent not found OR if agent has no LLM configured
 */
async function fetchAgentFromDb(id: number) {
    const db = await getDb()

    const result = await db
        .select({
            id: agents.id,
            name: agents.name,
            description: agents.description,
            isEnabled: agents.isEnabled,
            systemPrompt: agents.systemPrompt,
            topK: agents.topK,
            temperature: agents.temperature,
            maxTokens: agents.maxTokens,
            llm: llms,
            createdAt: agents.createdAt,
            updatedAt: agents.updatedAt,
        })
        .from(agents)
        .leftJoin(llms, eq(agents.llmId, llms.id))
        .where(eq(agents.id, id))
        .limit(1)

    if (!result[0]) return null

    const { llm, ...agentData } = result[0]

    // Validate LLM exists - return null if no LLM configured
    if (!llm) {
        return null
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

    return {
        ...agentData,
        llm: llm,
        datasourceGroups: agentGroups.map(g => ({ id: g.groupId, name: g.groupName })),
    }
}
export type AgentDetail = Awaited<ReturnType<typeof fetchAgentFromDb>>

/**
 * Get agent by ID with LLM and datasource groups (cached, 15 min TTL)
 */
export async function getAgentById(id: number) {
    logger.info('Getting agent by ID', { agentId: id })
    const cacheKey = getAgentCacheKey(id)

    // Try to get from cache
    try {
        const cached = await getKV<ReturnType<typeof fetchAgentFromDb>>(cacheKey, 'json')
        if (cached) {
            logger.info('Agent found in cache', { agentId: id })
            return cached
        }
    } catch (error) {
        logger.error('Error reading from cache', { agentId: id, error: String(error) })
        // Continue to fetch from DB if cache fails
    }

    // Fetch from database
    logger.info('Fetching agent from database', { agentId: id })
    const agent = await fetchAgentFromDb(id)

    // Cache the result (even null to prevent repeated DB queries for non-existent IDs)
    if (agent) {
        try {
            await putKV(cacheKey, JSON.stringify(agent), { expirationTtl: CACHE_TTL_SECONDS })
            logger.info('Agent cached successfully', { agentId: id })
        } catch (error) {
            logger.error('Error writing to cache', { agentId: id, error: String(error) })
        }
    } else {
        logger.warn('Agent not found', { agentId: id })
    }

    return agent
}

/**
 * Create a new agent with optional datasource group associations
 */
export async function createAgent(data: AgentData, datasourceGroupIds?: number[]) {
    logger.info('Creating agent', { name: data.name, datasourceGroupIds })
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
        logger.info('Created datasource group associations', { agentId: newAgent.id, count: datasourceGroupIds.length })
    }

    logger.info('Agent created successfully', { agentId: newAgent.id, name: newAgent.name })
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
    logger.info('Updating agent', { agentId: id, datasourceGroupIds })
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
        logger.info('Updated datasource group associations', { agentId: id, count: datasourceGroupIds.length })
    }

    // Invalidate cache after update
    await invalidateAgentCache(id)

    logger.info('Agent updated successfully', { agentId: id })
    return result[0]
}

/**
 * Delete an agent (junction table entries cascade automatically)
 */
export async function deleteAgent(id: number) {
    logger.info('Deleting agent', { agentId: id })
    const db = await getDb()
    await db.delete(agents).where(eq(agents.id, id))

    // Invalidate cache after delete
    await invalidateAgentCache(id)
    logger.info('Agent deleted successfully', { agentId: id })
}
