import { queryOptions, QueryClient } from '@tanstack/react-query'
import { honoClient } from '@/lib/api/hono-client'
import { agentsQuerySchema } from './params'
import { createAgentSchema } from './server/routers'
import { ApiError } from '@/lib/api/errors'
import { z } from 'zod'

// ============================================
// Type Inference
// ============================================

type AgentsQueryParams = z.infer<typeof agentsQuerySchema>
type CreateAgentInput = z.infer<typeof createAgentSchema>
type UpdateAgentInput = Partial<CreateAgentInput>

// ============================================
// Query Keys Factory
// ============================================

export const agentsKeys = {
    all: ['agents'] as const,
    lists: () => [...agentsKeys.all, 'list'] as const,
    list: (params: AgentsQueryParams) => [...agentsKeys.lists(), params] as const,
    details: () => [...agentsKeys.all, 'detail'] as const,
    detail: (id: number) => [...agentsKeys.details(), id] as const,
}

// ============================================
// Query Options - Queries
// ============================================

/**
 * Query options for fetching paginated list of agents
 */
export const agentsListQueryOptions = (params: AgentsQueryParams) => {
    return queryOptions({
        queryKey: agentsKeys.list(params),
        queryFn: async () => {
            const response = await honoClient.api.agents.$get({
                query: {
                    page: String(params.page),
                    pageSize: String(params.pageSize),
                    search: String(params.search),
                    sortBy: params.sortBy,
                    sortOrder: params.sortOrder,
                },
            })

            if (!response.ok) {
                throw new ApiError('Failed to fetch agents', response.status)
            }

            return response.json()
        },
    })
}

/**
 * Query options for fetching a single agent by ID
 */
export const agentDetailQueryOptions = (id: number) => {
    return queryOptions({
        queryKey: agentsKeys.detail(id),
        queryFn: async () => {
            const response = await honoClient.api.agents[':id'].$get({
                param: { id: String(id) },
            })

            if (!response.ok) {
                throw new ApiError(
                    response.status === 404 ? 'Agent not found' : 'Failed to fetch agent',
                    response.status
                )
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
 * Mutation function for creating a new agent
 */
export const createAgentMutation = async (data: CreateAgentInput) => {
    const response = await honoClient.api.agents.$post({
        json: data,
    })

    if (!response.ok) {
        throw new ApiError('Failed to create agent', response.status)
    }

    return response.json()
}

/**
 * Mutation function for updating an existing agent
 */
export const updateAgentMutation = async (params: {
    id: number
    data: UpdateAgentInput
}) => {
    const response = await honoClient.api.agents[':id'].$patch({
        param: { id: String(params.id) },
        json: params.data,
    })

    if (!response.ok) {
        throw new ApiError(
            response.status === 404 ? 'Agent not found' : 'Failed to update agent',
            response.status
        )
    }

    return response.json()
}

/**
 * Mutation function for deleting an agent
 */
export const deleteAgentMutation = async (id: number) => {
    const response = await honoClient.api.agents[':id'].$delete({
        param: { id: String(id) },
    })

    if (!response.ok) {
        throw new ApiError(
            response.status === 404 ? 'Agent not found' : 'Failed to delete agent',
            response.status
        )
    }

    return response.json()
}

// ============================================
// Utility Functions
// ============================================

/**
 * Helper to invalidate all agent queries
 */
export const invalidateAgentsQueries = (queryClient: QueryClient) => {
    return queryClient.invalidateQueries({ queryKey: agentsKeys.all })
}

/**
 * Helper to invalidate agent list queries only
 */
export const invalidateAgentsListQueries = (queryClient: QueryClient) => {
    return queryClient.invalidateQueries({ queryKey: agentsKeys.lists() })
}

/**
 * Helper to invalidate a specific agent detail query
 */
export const invalidateAgentDetailQuery = (queryClient: QueryClient, id: number) => {
    return queryClient.invalidateQueries({ queryKey: agentsKeys.detail(id) })
}
