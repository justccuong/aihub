import { llmsParams } from '../params'
import { useQueryStates } from 'nuqs'

/**
 * Hook to manage LLM query parameters in the URL
 * Syncs pagination, search, and sorting state with URL query parameters
 */
export const useLlmsParams = () => {
    return useQueryStates(llmsParams)
}
