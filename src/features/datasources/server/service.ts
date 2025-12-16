import { z } from 'zod'
import { getDb } from '@/lib/db'
import { datasources, datasourceGroups } from '@/lib/schema'
import { eq, like, desc, asc, sql, and } from 'drizzle-orm'
import { datasourcesQuerySchema } from '../params'
import { createDatasourceSchema } from './routers'

// Infer types from existing schemas (single source of truth)
export type ListDatasourcesQueryParams = z.infer<typeof datasourcesQuerySchema>
export type ListDatasourcesParams = ListDatasourcesQueryParams & { groupId: number }
export type CreateDatasourceInput = z.infer<typeof createDatasourceSchema>
export type UpdateDatasourceInput = { content?: string }

/**
 * List datasources by group with pagination and search
 */
export async function listDatasourcesByGroup(params: ListDatasourcesParams) {
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
    const db = await getDb()
    const result = await db
        .select()
        .from(datasources)
        .where(eq(datasources.id, id))
        .limit(1)

    return result[0] || null
}

/**
 * Check if a datasource exists, returns the record or null
 */
export async function datasourceExists(id: number) {
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
    const db = await getDb()
    const result = await db.insert(datasources).values(data).returning()
    return result[0]
}

/**
 * Update a datasource
 */
export async function updateDatasource(id: number, data: UpdateDatasourceInput) {
    const db = await getDb()
    const result = await db
        .update(datasources)
        .set(data)
        .where(eq(datasources.id, id))
        .returning()

    return result[0]
}

/**
 * Delete a datasource
 */
export async function deleteDatasource(id: number) {
    const db = await getDb()
    await db.delete(datasources).where(eq(datasources.id, id))
}
