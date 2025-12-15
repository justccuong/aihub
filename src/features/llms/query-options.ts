import { queryOptions, infiniteQueryOptions } from '@tanstack/react-query'
import { honoClient } from '@/lib/api/hono-client'
import { llmsQuerySchema } from './params'
import { z } from 'zod'

// ============================================
// Type Inference
// ============================================

type LlmsQueryParams = z.infer<typeof llmsQuerySchema>

// ============================================
// Query Keys Factory
// ============================================

export const llmsKeys = {
    all: ['llms'] as const,
    lists: () => [...llmsKeys.all, 'list'] as const,
    list: (params: LlmsQueryParams) => [...llmsKeys.lists(), params] as const,
    details: () => [...llmsKeys.all, 'detail'] as const,
    detail: (id: number) => [...llmsKeys.details(), id] as const,
}

// ============================================
// Query Options - Queries
// ============================================

/**
 * Query options for fetching paginated list of LLMs
 */
export const llmsListQueryOptions = (params: LlmsQueryParams) => {
    return queryOptions({
        queryKey: llmsKeys.list(params),
        queryFn: async () => {
            const response = await honoClient.api.llms.$get({
                query: {
                    page: String(params.page),
                    pageSize: String(params.pageSize),
                    search: String(params.search),
                    sortBy: params.sortBy,
                    sortOrder: params.sortOrder,
                },
            })

            if (!response.ok) {
                throw new Error('Failed to fetch LLMs')
            }

            return response.json()
        },
    })
}

/**
 * Query options for fetching a single LLM by ID
 */
export const llmDetailQueryOptions = (id: number) => {
    return queryOptions({
        queryKey: llmsKeys.detail(id),
        queryFn: async () => {
            const response = await honoClient.api.llms[':id'].$get({
                param: { id: String(id) },
            })

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('LLM not found')
                }
                throw new Error('Failed to fetch LLM')
            }

            return response.json()
        },
        enabled: id > 0, // Only run query if ID is valid
    })
}

// ============================================
// Query Options - Mutations
// ============================================

/**
 * Mutation function for creating a new LLM
 */
export const createLlmMutation = async (data: {
    name: string
    description?: string
    provider: string
    model: string
    baseUrl: string
    apiKey: string
}) => {
    const response = await honoClient.api.llms.$post({
        json: data,
    })

    if (!response.ok) {
        throw new Error('Failed to create LLM')
    }

    return response.json()
}

/**
 * Mutation function for updating an existing LLM
 */
export const updateLlmMutation = async (params: {
    id: number
    data: {
        name?: string
        description?: string
        provider?: string
        model?: string
        baseUrl?: string
        apiKey?: string
    }
}) => {
    const response = await honoClient.api.llms[':id'].$patch({
        param: { id: String(params.id) },
        json: params.data,
    })

    if (!response.ok) {
        if (response.status === 404) {
            throw new Error('LLM not found')
        }
        throw new Error('Failed to update LLM')
    }

    return response.json()
}

/**
 * Mutation function for deleting an LLM
 */
export const deleteLlmMutation = async (id: number) => {
    const response = await honoClient.api.llms[':id'].$delete({
        param: { id: String(id) },
    })

    if (!response.ok) {
        if (response.status === 404) {
            throw new Error('LLM not found')
        }
        throw new Error('Failed to delete LLM')
    }

    return response.json()
}

// ============================================
// Utility Functions
// ============================================

/**
 * Helper to invalidate all LLM queries
 */
export const invalidateLlmsQueries = (queryClient: any) => {
    return queryClient.invalidateQueries({ queryKey: llmsKeys.all })
}

/**
 * Helper to invalidate LLM list queries only
 */
export const invalidateLlmsListQueries = (queryClient: any) => {
    return queryClient.invalidateQueries({ queryKey: llmsKeys.lists() })
}

/**
 * Helper to invalidate a specific LLM detail query
 */
export const invalidateLlmDetailQuery = (queryClient: any, id: number) => {
    return queryClient.invalidateQueries({ queryKey: llmsKeys.detail(id) })
}
