import { useSuspenseQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    agentsListQueryOptions,
    agentDetailQueryOptions,
    createAgentMutation,
    updateAgentMutation,
    deleteAgentMutation,
    agentsKeys,
} from '../query-options'
import { agentsQuerySchema } from '../params'
import { z } from 'zod'
import { toast } from 'sonner'

type AgentsQueryParams = z.infer<typeof agentsQuerySchema>

// ============================================
// Query Hooks (Suspense)
// ============================================

/**
 * Hook to fetch paginated list of agents
 * Uses useSuspenseQuery - must be used within Suspense boundary
 */
export const useAgentsList = (params: AgentsQueryParams) => {
    return useSuspenseQuery(agentsListQueryOptions(params))
}

/**
 * Hook to fetch a single agent by ID
 * Uses useSuspenseQuery - must be used within Suspense boundary
 */
export const useAgentDetail = (id: number) => {
    return useSuspenseQuery(agentDetailQueryOptions(id))
}

// ============================================
// Mutation Hooks
// ============================================

/**
 * Hook to create a new agent
 */
export const useCreateAgent = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: createAgentMutation,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: agentsKeys.lists() })
            toast.success('Agent created successfully')
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to create agent')
        },
    })
}

/**
 * Hook to update an existing agent
 */
export const useUpdateAgent = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: updateAgentMutation,
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: agentsKeys.detail(variables.id) })
            queryClient.invalidateQueries({ queryKey: agentsKeys.lists() })
            toast.success('Agent updated successfully')
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to update agent')
        },
    })
}

/**
 * Hook to delete an agent
 */
export const useDeleteAgent = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: deleteAgentMutation,
        onSuccess: (data, id) => {
            queryClient.removeQueries({ queryKey: agentsKeys.detail(id) })
            queryClient.invalidateQueries({ queryKey: agentsKeys.lists() })
            toast.success('Agent deleted successfully')
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to delete agent')
        },
    })
}
