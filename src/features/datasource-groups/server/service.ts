import { z } from 'zod'
import { getDb } from '@/lib/db'
import { datasourceGroups } from '@/lib/schema'
import { eq, like, or, desc, asc, sql } from 'drizzle-orm'
import { datasourceGroupsQuerySchema } from '../params'
import { createDatasourceGroupSchema } from './routers'

// Infer types from existing schemas (single source of truth)
export type ListDatasourceGroupsParams = z.infer<typeof datasourceGroupsQuerySchema>
export type CreateDatasourceGroupInput = z.infer<typeof createDatasourceGroupSchema>
export type UpdateDatasourceGroupInput = Partial<CreateDatasourceGroupInput>

/**
 * List datasource groups with pagination and search
 */
export async function listDatasourceGroups(params: ListDatasourceGroupsParams) {
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
    const db = await getDb()
    const result = await db
        .select()
        .from(datasourceGroups)
        .where(eq(datasourceGroups.id, id))
        .limit(1)

    return result[0] || null
}

/**
 * Check if a datasource group exists
 */
export async function datasourceGroupExists(id: number) {
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
    const db = await getDb()
    const result = await db.insert(datasourceGroups).values(data).returning()
    return result[0]
}

/**
 * Update a datasource group
 */
export async function updateDatasourceGroup(id: number, data: UpdateDatasourceGroupInput) {
    const db = await getDb()
    const result = await db
        .update(datasourceGroups)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(datasourceGroups.id, id))
        .returning()

    return result[0]
}

/**
 * Delete a datasource group
 */
export async function deleteDatasourceGroup(id: number) {
    const db = await getDb()
    await db.delete(datasourceGroups).where(eq(datasourceGroups.id, id))
}
