import { useSuspenseQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    datasourceGroupsListQueryOptions,
    datasourceGroupDetailQueryOptions,
    createDatasourceGroupMutation,
    updateDatasourceGroupMutation,
    deleteDatasourceGroupMutation,
    datasourceGroupsKeys,
} from '../query-options'
import { agentsKeys } from '@/features/agents/query-options'
import { datasourceGroupsQuerySchema } from '../params'
import { z } from 'zod'
import { toast } from 'sonner'

type DatasourceGroupsQueryParams = z.infer<typeof datasourceGroupsQuerySchema>

// ============================================
// Query Hooks (Suspense)
// ============================================

/**
 * Hook to fetch paginated list of datasource groups
 * Uses useSuspenseQuery - must be used within Suspense boundary
 */
export const useDatasourceGroupsList = (params: DatasourceGroupsQueryParams) => {
    return useSuspenseQuery(datasourceGroupsListQueryOptions(params))
}

/**
 * Hook to fetch a single datasource group by ID
 * Uses useSuspenseQuery - must be used within Suspense boundary
 */
export const useDatasourceGroupDetail = (id: number) => {
    return useSuspenseQuery(datasourceGroupDetailQueryOptions(id))
}

// ============================================
// Mutation Hooks
// ============================================

/**
 * Hook to create a new datasource group
 */
export const useCreateDatasourceGroup = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: createDatasourceGroupMutation,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: datasourceGroupsKeys.lists() })
            toast.success('Datasource group created successfully')
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to create datasource group')
        },
    })
}

/**
 * Hook to update an existing datasource group
 */
export const useUpdateDatasourceGroup = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: updateDatasourceGroupMutation,
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: datasourceGroupsKeys.detail(variables.id) })
            queryClient.invalidateQueries({ queryKey: datasourceGroupsKeys.lists() })
            // Invalidate agents cache since they reference datasource groups
            queryClient.invalidateQueries({ queryKey: agentsKeys.all })
            toast.success('Datasource group updated successfully')
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to update datasource group')
        },
    })
}

/**
 * Hook to delete a datasource group
 */
export const useDeleteDatasourceGroup = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: deleteDatasourceGroupMutation,
        onSuccess: (data, id) => {
            queryClient.removeQueries({ queryKey: datasourceGroupsKeys.detail(id) })
            queryClient.invalidateQueries({ queryKey: datasourceGroupsKeys.lists() })
            // Invalidate agents cache since they reference datasource groups
            queryClient.invalidateQueries({ queryKey: agentsKeys.all })
            toast.success('Datasource group deleted successfully')
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to delete datasource group')
        },
    })
}
