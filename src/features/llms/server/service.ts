import { z } from 'zod'
import { getDb } from '@/lib/db'
import { llms } from '@/lib/schema'
import { eq, like, or, desc, asc, sql } from 'drizzle-orm'
import { llmsQuerySchema } from '../params'
import { createLlmSchema } from './routers'
import { llmsLogger as logger } from '@/lib/logger'

// Infer types from existing schemas (single source of truth)
export type ListLlmsParams = z.infer<typeof llmsQuerySchema>
export type CreateLlmInput = z.infer<typeof createLlmSchema>
export type UpdateLlmInput = Partial<CreateLlmInput>

/**
 * List LLMs with pagination and search
 */
export async function listLlms(params: ListLlmsParams) {
    logger.info('Listing LLMs', { page: params.page, pageSize: params.pageSize, search: params.search })
    const db = await getDb()
    const { page, pageSize, search, sortBy, sortOrder } = params
    const offset = (page - 1) * pageSize

    // Build where clause for search
    const whereConditions = search
        ? or(
            like(llms.name, `%${search}%`),
            like(llms.provider, `%${search}%`),
            like(llms.model, `%${search}%`),
            like(llms.description, `%${search}%`)
        )
        : undefined

    // Determine sort column
    const sortColumn = {
        name: llms.name,
        provider: llms.provider,
        createdAt: llms.createdAt,
        updatedAt: llms.updatedAt,
    }[sortBy]

    // Get total count
    const totalResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(llms)
        .where(whereConditions)

    const total = totalResult[0]?.count || 0

    // Get paginated data
    const data = await db
        .select()
        .from(llms)
        .where(whereConditions)
        .orderBy(sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn))
        .limit(pageSize)
        .offset(offset)

    logger.info('Listed LLMs successfully', { total, page, pageSize })
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
 * Get LLM by ID
 */
export async function getLlmById(id: number) {
    logger.info('Getting LLM by ID', { llmId: id })
    const db = await getDb()
    const result = await db
        .select()
        .from(llms)
        .where(eq(llms.id, id))
        .limit(1)

    if (!result[0]) {
        logger.warn('LLM not found', { llmId: id })
    }
    return result[0] || null
}

/**
 * Check if an LLM exists
 */
export async function llmExists(id: number) {
    logger.debug('Checking if LLM exists', { llmId: id })
    const db = await getDb()
    const existing = await db
        .select()
        .from(llms)
        .where(eq(llms.id, id))
        .limit(1)
    return !!existing[0]
}

/**
 * Create a new LLM
 */
export async function createLlm(data: CreateLlmInput) {
    logger.info('Creating LLM', { name: data.name, provider: data.provider, model: data.model })
    const db = await getDb()
    const result = await db.insert(llms).values(data).returning()
    logger.info('LLM created successfully', { llmId: result[0].id, name: result[0].name })
    return result[0]
}

/**
 * Update an LLM
 */
export async function updateLlm(id: number, data: UpdateLlmInput) {
    logger.info('Updating LLM', { llmId: id })
    const db = await getDb()
    const result = await db
        .update(llms)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(llms.id, id))
        .returning()

    logger.info('LLM updated successfully', { llmId: id })
    return result[0]
}

/**
 * Delete an LLM
 */
export async function deleteLlm(id: number) {
    logger.info('Deleting LLM', { llmId: id })
    const db = await getDb()
    await db.delete(llms).where(eq(llms.id, id))
    logger.info('LLM deleted successfully', { llmId: id })
}
