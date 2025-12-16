import { z } from 'zod'
import { getDb } from '@/lib/db'
import { datasourceGroups } from '@/lib/schema'
import { eq, like, or, desc, asc, sql } from 'drizzle-orm'
import { datasourceGroupsQuerySchema } from '../params'
import { createDatasourceGroupSchema } from './routers'
import { datasourceGroupsLogger as logger } from '@/lib/logger'

// Infer types from existing schemas (single source of truth)
export type ListDatasourceGroupsParams = z.infer<typeof datasourceGroupsQuerySchema>
export type CreateDatasourceGroupInput = z.infer<typeof createDatasourceGroupSchema>
export type UpdateDatasourceGroupInput = Partial<CreateDatasourceGroupInput>

/**
 * List datasource groups with pagination and search
 */
export async function listDatasourceGroups(params: ListDatasourceGroupsParams) {
    logger.info('Listing datasource groups', { page: params.page, pageSize: params.pageSize, search: params.search })
    const db = await getDb()
    const { page, pageSize, search, sortBy, sortOrder } = params
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

    logger.info('Listed datasource groups successfully', { total, page, pageSize })
    return {
        data,
        pagination: {
            page,
            pageSize,
            total,
            totalPages: Math.ceil(total / pageSize),
        },
    }
}

/**
 * Get datasource group by ID
 */
export async function getDatasourceGroupById(id: number) {
    logger.info('Getting datasource group by ID', { groupId: id })
    const db = await getDb()
    const result = await db
        .select()
        .from(datasourceGroups)
        .where(eq(datasourceGroups.id, id))
        .limit(1)

    if (!result[0]) {
        logger.warn('Datasource group not found', { groupId: id })
    }
    return result[0] || null
}

/**
 * Check if a datasource group exists
 */
export async function datasourceGroupExists(id: number) {
    logger.debug('Checking if datasource group exists', { groupId: id })
    const db = await getDb()
    const existing = await db
        .select()
        .from(datasourceGroups)
        .where(eq(datasourceGroups.id, id))
        .limit(1)
    return !!existing[0]
}

/**
 * Create a new datasource group
 */
export async function createDatasourceGroup(data: CreateDatasourceGroupInput) {
    logger.info('Creating datasource group', { name: data.name })
    const db = await getDb()
    const result = await db.insert(datasourceGroups).values(data).returning()
    logger.info('Datasource group created successfully', { groupId: result[0].id, name: result[0].name })
    return result[0]
}

/**
 * Update a datasource group
 */
export async function updateDatasourceGroup(id: number, data: UpdateDatasourceGroupInput) {
    logger.info('Updating datasource group', { groupId: id })
    const db = await getDb()
    const result = await db
        .update(datasourceGroups)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(datasourceGroups.id, id))
        .returning()

    logger.info('Datasource group updated successfully', { groupId: id })
    return result[0]
}

/**
 * Delete a datasource group
 */
export async function deleteDatasourceGroup(id: number) {
    logger.info('Deleting datasource group', { groupId: id })
    const db = await getDb()
    await db.delete(datasourceGroups).where(eq(datasourceGroups.id, id))
    logger.info('Datasource group deleted successfully', { groupId: id })
}
