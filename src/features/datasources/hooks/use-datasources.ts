import { useSuspenseQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    datasourcesListQueryOptions,
    datasourceDetailQueryOptions,
    createDatasourceMutation,
    updateDatasourceMutation,
    deleteDatasourceMutation,
    datasourcesKeys,
} from '../query-options'
import { datasourcesQuerySchema } from '../params'
import { z } from 'zod'
import { toast } from 'sonner'

type DatasourcesQueryParams = z.infer<typeof datasourcesQuerySchema>

// ============================================
// Query Hooks (Suspense)
// ============================================

/**
 * Hook to fetch paginated list of datasources for a group
 * Uses useSuspenseQuery - must be used within Suspense boundary
 */
export const useDatasourcesList = (groupId: number, params: DatasourcesQueryParams) => {
    return useSuspenseQuery(datasourcesListQueryOptions(groupId, params))
}

/**
 * Hook to fetch a single datasource by ID
 * Uses useSuspenseQuery - must be used within Suspense boundary
 */
export const useDatasourceDetail = (id: number) => {
    return useSuspenseQuery(datasourceDetailQueryOptions(id))
}

// ============================================
// Mutation Hooks
// ============================================

/**
 * Hook to create a new datasource
 */
export const useCreateDatasource = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: createDatasourceMutation,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: datasourcesKeys.lists() })
            toast.success('Datasource created successfully')
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to create datasource')
        },
    })
}

/**
 * Hook to update an existing datasource
 */
export const useUpdateDatasource = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: updateDatasourceMutation,
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: datasourcesKeys.detail(variables.id) })
            queryClient.invalidateQueries({ queryKey: datasourcesKeys.lists() })
            toast.success('Datasource updated successfully')
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to update datasource')
        },
    })
}

/**
 * Hook to delete a datasource
 */
export const useDeleteDatasource = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: deleteDatasourceMutation,
        onSuccess: (data, id) => {
            queryClient.removeQueries({ queryKey: datasourcesKeys.detail(id) })
            queryClient.invalidateQueries({ queryKey: datasourcesKeys.lists() })
            toast.success('Datasource deleted successfully')
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to delete datasource')
        },
    })
}
