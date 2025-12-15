import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    llmsListQueryOptions,
    llmDetailQueryOptions,
    createLlmMutation,
    updateLlmMutation,
    deleteLlmMutation,
    llmsKeys,
} from '../query-options'
import { llmsQuerySchema } from '../params'
import { z } from 'zod'
import { toast } from 'sonner'

type LlmsQueryParams = z.infer<typeof llmsQuerySchema>

// ============================================
// Query Hooks
// ============================================

/**
 * Hook to fetch paginated list of LLMs
 * @param params - Query parameters (page, pageSize, search, sortBy, sortOrder)
 */
export const useLlmsList = (params: LlmsQueryParams) => {
    return useQuery(llmsListQueryOptions(params))
}

/**
 * Hook to fetch a single LLM by ID
 * @param id - LLM ID
 */
export const useLlmDetail = (id: number) => {
    return useQuery(llmDetailQueryOptions(id))
}

// ============================================
// Mutation Hooks
// ============================================

/**
 * Hook to create a new LLM
 * @returns Mutation object with mutate, mutateAsync, etc.
 */
export const useCreateLlm = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: createLlmMutation,
        onSuccess: () => {
            // Invalidate all LLM list queries to refetch updated data
            queryClient.invalidateQueries({ queryKey: llmsKeys.lists() })
            toast.success('LLM created successfully')
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to create LLM')
        },
    })
}

/**
 * Hook to update an existing LLM
 * @returns Mutation object with mutate, mutateAsync, etc.
 */
export const useUpdateLlm = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: updateLlmMutation,
        onSuccess: (data, variables) => {
            // Invalidate both the specific detail query and all list queries
            queryClient.invalidateQueries({ queryKey: llmsKeys.detail(variables.id) })
            queryClient.invalidateQueries({ queryKey: llmsKeys.lists() })
            toast.success('LLM updated successfully')
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to update LLM')
        },
    })
}

/**
 * Hook to delete an LLM
 * @returns Mutation object with mutate, mutateAsync, etc.
 */
export const useDeleteLlm = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: deleteLlmMutation,
        onSuccess: (data, id) => {
            // Remove the deleted item from cache and invalidate lists
            queryClient.removeQueries({ queryKey: llmsKeys.detail(id) })
            queryClient.invalidateQueries({ queryKey: llmsKeys.lists() })
            toast.success('LLM deleted successfully')
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to delete LLM')
        },
    })
}

// ============================================
// Composed Hooks
// ============================================

/**
 * All-in-one hook that provides both queries and mutations
 * Useful when you need multiple operations in a single component
 * @param params - Query parameters for list
 * @param detailId - Optional ID for detail query
 */
export const useLlms = (params: LlmsQueryParams, detailId?: number) => {
    const list = useLlmsList(params)
    const detail = detailId ? useLlmDetail(detailId) : null
    const create = useCreateLlm()
    const update = useUpdateLlm()
    const remove = useDeleteLlm()

    return {
        // Queries
        list,
        detail,
        // Mutations
        create,
        update,
        delete: remove,
    }
}
