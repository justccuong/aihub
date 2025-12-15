import { queryOptions, QueryClient } from '@tanstack/react-query'
import { honoClient } from '@/lib/api/hono-client'
import { datasourceGroupsQuerySchema } from './params'
import { createDatasourceGroupSchema } from './server/routers'
import { ApiError } from '@/lib/api/errors'
import { z } from 'zod'

// ============================================
// Type Inference
// ============================================

type DatasourceGroupsQueryParams = z.infer<typeof datasourceGroupsQuerySchema>
type CreateDatasourceGroupInput = z.infer<typeof createDatasourceGroupSchema>
type UpdateDatasourceGroupInput = Partial<CreateDatasourceGroupInput>

// ============================================
// Query Keys Factory
// ============================================

export const datasourceGroupsKeys = {
    all: ['datasource-groups'] as const,
    lists: () => [...datasourceGroupsKeys.all, 'list'] as const,
    list: (params: DatasourceGroupsQueryParams) => [...datasourceGroupsKeys.lists(), params] as const,
    details: () => [...datasourceGroupsKeys.all, 'detail'] as const,
    detail: (id: number) => [...datasourceGroupsKeys.details(), id] as const,
}

// ============================================
// Query Options - Queries
// ============================================

/**
 * Query options for fetching paginated list of datasource groups
 */
export const datasourceGroupsListQueryOptions = (params: DatasourceGroupsQueryParams) => {
    return queryOptions({
        queryKey: datasourceGroupsKeys.list(params),
        queryFn: async () => {
            const response = await honoClient.api['datasource-groups'].$get({
                query: {
                    page: String(params.page),
                    pageSize: String(params.pageSize),
                    search: String(params.search),
                    sortBy: params.sortBy,
                    sortOrder: params.sortOrder,
                },
            })

            if (!response.ok) {
                throw new ApiError('Failed to fetch datasource groups', response.status)
            }

            return response.json()
        },
    })
}

/**
 * Query options for fetching a single datasource group by ID
 */
export const datasourceGroupDetailQueryOptions = (id: number) => {
    return queryOptions({
        queryKey: datasourceGroupsKeys.detail(id),
        queryFn: async () => {
            const response = await honoClient.api['datasource-groups'][':id'].$get({
                param: { id: String(id) },
            })

            if (!response.ok) {
                throw new ApiError(
                    response.status === 404 ? 'Datasource group not found' : 'Failed to fetch datasource group',
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
 * Mutation function for creating a new datasource group
 */
export const createDatasourceGroupMutation = async (data: CreateDatasourceGroupInput) => {
    const response = await honoClient.api['datasource-groups'].$post({
        json: data,
    })

    if (!response.ok) {
        throw new ApiError('Failed to create datasource group', response.status)
    }

    return response.json()
}

/**
 * Mutation function for updating an existing datasource group
 */
export const updateDatasourceGroupMutation = async (params: {
    id: number
    data: UpdateDatasourceGroupInput
}) => {
    const response = await honoClient.api['datasource-groups'][':id'].$patch({
        param: { id: String(params.id) },
        json: params.data,
    })

    if (!response.ok) {
        throw new ApiError(
            response.status === 404 ? 'Datasource group not found' : 'Failed to update datasource group',
            response.status
        )
    }

    return response.json()
}

/**
 * Mutation function for deleting a datasource group
 */
export const deleteDatasourceGroupMutation = async (id: number) => {
    const response = await honoClient.api['datasource-groups'][':id'].$delete({
        param: { id: String(id) },
    })

    if (!response.ok) {
        throw new ApiError(
            response.status === 404 ? 'Datasource group not found' : 'Failed to delete datasource group',
            response.status
        )
    }

    return response.json()
}

// ============================================
// Utility Functions
// ============================================

/**
 * Helper to invalidate all datasource group queries
 */
export const invalidateDatasourceGroupsQueries = (queryClient: QueryClient) => {
    return queryClient.invalidateQueries({ queryKey: datasourceGroupsKeys.all })
}

/**
 * Helper to invalidate datasource group list queries only
 */
export const invalidateDatasourceGroupsListQueries = (queryClient: QueryClient) => {
    return queryClient.invalidateQueries({ queryKey: datasourceGroupsKeys.lists() })
}

/**
 * Helper to invalidate a specific datasource group detail query
 */
export const invalidateDatasourceGroupDetailQuery = (queryClient: QueryClient, id: number) => {
    return queryClient.invalidateQueries({ queryKey: datasourceGroupsKeys.detail(id) })
}
