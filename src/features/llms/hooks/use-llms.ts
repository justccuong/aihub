import { useSuspenseQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
// Query Hooks (Suspense)
// ============================================

/**
 * Hook to fetch paginated list of LLMs
 * Uses useSuspenseQuery - must be used within Suspense boundary
 */
export const useLlmsList = (params: LlmsQueryParams) => {
    return useSuspenseQuery(llmsListQueryOptions(params))
}

/**
 * Hook to fetch a single LLM by ID
 * Uses useSuspenseQuery - must be used within Suspense boundary
 */
export const useLlmDetail = (id: number) => {
    return useSuspenseQuery(llmDetailQueryOptions(id))
}

// ============================================
// Mutation Hooks
// ============================================

/**
 * Hook to create a new LLM
 */
export const useCreateLlm = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: createLlmMutation,
        onSuccess: () => {
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
 */
export const useUpdateLlm = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: updateLlmMutation,
        onSuccess: (data, variables) => {
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
 */
export const useDeleteLlm = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: deleteLlmMutation,
        onSuccess: (data, id) => {
            queryClient.removeQueries({ queryKey: llmsKeys.detail(id) })
            queryClient.invalidateQueries({ queryKey: llmsKeys.lists() })
            toast.success('LLM deleted successfully')
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to delete LLM')
        },
    })
}
