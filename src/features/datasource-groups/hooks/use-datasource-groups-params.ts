import { datasourceGroupsParams } from '../params'
import { useQueryStates } from 'nuqs'

/**
 * Hook to manage datasource groups query parameters in the URL
 * Syncs pagination, search, and sorting state with URL query parameters
 */
export const useDatasourceGroupsParams = () => {
    return useQueryStates(datasourceGroupsParams)
}
