import { queryOptions, QueryClient } from '@tanstack/react-query'
import { honoClient } from '@/lib/api/hono-client'
import { datasourcesQuerySchema } from './params'
import { createDatasourceSchema } from './server/routers'
import { ApiError } from '@/lib/api/errors'
import { z } from 'zod'

// ============================================
// Type Inference
// ============================================

type DatasourcesQueryParams = z.infer<typeof datasourcesQuerySchema>
type CreateDatasourceInput = z.infer<typeof createDatasourceSchema>
type UpdateDatasourceInput = Pick<Partial<CreateDatasourceInput>, 'content'>

// ============================================
// Query Keys Factory
// ============================================

export const datasourcesKeys = {
    all: ['datasources'] as const,
    lists: () => [...datasourcesKeys.all, 'list'] as const,
    list: (groupId: number, params: DatasourcesQueryParams) => [...datasourcesKeys.lists(), groupId, params] as const,
    details: () => [...datasourcesKeys.all, 'detail'] as const,
    detail: (id: number) => [...datasourcesKeys.details(), id] as const,
}

// ============================================
// Query Options - Queries
// ============================================

/**
 * Query options for fetching paginated list of datasources for a group
 */
export const datasourcesListQueryOptions = (groupId: number, params: DatasourcesQueryParams) => {
    return queryOptions({
        queryKey: datasourcesKeys.list(groupId, params),
        queryFn: async () => {
            const response = await honoClient.api.datasources.group[':groupId'].$get({
                param: { groupId: String(groupId) },
                query: {
                    page: String(params.page),
                    pageSize: String(params.pageSize),
                    search: String(params.search),
                    sortOrder: params.sortOrder,
                },
            })

            if (!response.ok) {
                throw new ApiError('Failed to fetch datasources', response.status)
            }

            return response.json()
        },
        enabled: groupId > 0,
    })
}

/**
 * Query options for fetching a single datasource by ID
 */
export const datasourceDetailQueryOptions = (id: number) => {
    return queryOptions({
        queryKey: datasourcesKeys.detail(id),
        queryFn: async () => {
            const response = await honoClient.api.datasources[':id'].$get({
                param: { id: String(id) },
            })

            if (!response.ok) {
                throw new ApiError(
                    response.status === 404 ? 'Datasource not found' : 'Failed to fetch datasource',
                    response.status
                )
            }

            return response.json()
        },
        enabled: id > 0,
    })
}

// ============================================
// Query Options - Mutations
// ============================================

/**
 * Mutation function for creating a new datasource
 */
export const createDatasourceMutation = async (data: CreateDatasourceInput) => {
    const response = await honoClient.api.datasources.$post({
        json: data,
    })

    if (!response.ok) {
        throw new ApiError('Failed to create datasource', response.status)
    }

    return response.json()
}

/**
 * Mutation function for updating an existing datasource
 */
export const updateDatasourceMutation = async (params: {
    id: number
    data: UpdateDatasourceInput
}) => {
    const response = await honoClient.api.datasources[':id'].$patch({
        param: { id: String(params.id) },
        json: params.data,
    })

    if (!response.ok) {
        throw new ApiError(
            response.status === 404 ? 'Datasource not found' : 'Failed to update datasource',
            response.status
        )
    }

    return response.json()
}

/**
 * Mutation function for deleting a datasource
 */
export const deleteDatasourceMutation = async (id: number) => {
    const response = await honoClient.api.datasources[':id'].$delete({
        param: { id: String(id) },
    })

    if (!response.ok) {
        throw new ApiError(
            response.status === 404 ? 'Datasource not found' : 'Failed to delete datasource',
            response.status
        )
    }

    return response.json()
}

// ============================================
// Utility Functions
// ============================================

/**
 * Helper to invalidate all datasource queries
 */
export const invalidateDatasourcesQueries = (queryClient: QueryClient) => {
    return queryClient.invalidateQueries({ queryKey: datasourcesKeys.all })
}

/**
 * Helper to invalidate datasource list queries only
 */
export const invalidateDatasourcesListQueries = (queryClient: QueryClient) => {
    return queryClient.invalidateQueries({ queryKey: datasourcesKeys.lists() })
}
