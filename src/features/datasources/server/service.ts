import { z } from 'zod'
import { getDb } from '@/lib/db'
import { datasources, datasourceGroups } from '@/lib/schema'
import { eq, like, desc, asc, sql, and } from 'drizzle-orm'
import { datasourcesQuerySchema } from '../params'
import { createDatasourceSchema } from './routers'
import { datasourcesLogger as logger } from '@/lib/logger'

// Infer types from existing schemas (single source of truth)
export type ListDatasourcesQueryParams = z.infer<typeof datasourcesQuerySchema>
export type ListDatasourcesParams = ListDatasourcesQueryParams & { groupId: number }
export type CreateDatasourceInput = z.infer<typeof createDatasourceSchema>
export type UpdateDatasourceInput = { content?: string }

/**
 * List datasources by group with pagination and search
 */
export async function listDatasourcesByGroup(params: ListDatasourcesParams) {
    logger.info('Listing datasources by group', { groupId: params.groupId, page: params.page, pageSize: params.pageSize, search: params.search })
    const db = await getDb()
    const { groupId, page, pageSize, search, sortOrder } = params
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

    logger.info('Listed datasources successfully', { groupId, total, page, pageSize })
    return {
        data,
        group: groupInfo[0] || null,
        pagination: {
            page,
            pageSize,
            total,
            totalPages: Math.ceil(total / pageSize),
        },
    }
}

/**
 * Get datasource by ID
 */
export async function getDatasourceById(id: number) {
    logger.info('Getting datasource by ID', { datasourceId: id })
    const db = await getDb()
    const result = await db
        .select()
        .from(datasources)
        .where(eq(datasources.id, id))
        .limit(1)

    if (!result[0]) {
        logger.warn('Datasource not found', { datasourceId: id })
    }
    return result[0] || null
}

/**
 * Check if a datasource exists, returns the record or null
 */
export async function datasourceExists(id: number) {
    logger.debug('Checking if datasource exists', { datasourceId: id })
    const db = await getDb()
    const existing = await db
        .select()
        .from(datasources)
        .where(eq(datasources.id, id))
        .limit(1)
    return existing[0] || null
}

/**
 * Create a new datasource (DB insert only, vector handled in router)
 */
export async function createDatasource(data: CreateDatasourceInput) {
    logger.info('Creating datasource', { groupId: data.datasourceGroupId })
    const db = await getDb()
    const result = await db.insert(datasources).values(data).returning()
    logger.info('Datasource created successfully', { datasourceId: result[0].id })
    return result[0]
}

/**
 * Update a datasource
 */
export async function updateDatasource(id: number, data: UpdateDatasourceInput) {
    logger.info('Updating datasource', { datasourceId: id })
    const db = await getDb()
    const result = await db
        .update(datasources)
        .set(data)
        .where(eq(datasources.id, id))
        .returning()

    logger.info('Datasource updated successfully', { datasourceId: id })
    return result[0]
}

/**
 * Delete a datasource
 */
export async function deleteDatasource(id: number) {
    logger.info('Deleting datasource', { datasourceId: id })
    const db = await getDb()
    await db.delete(datasources).where(eq(datasources.id, id))
    logger.info('Datasource deleted successfully', { datasourceId: id })
}
