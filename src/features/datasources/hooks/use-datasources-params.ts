import { datasourcesParams } from '../params'
import { useQueryStates } from 'nuqs'

/**
 * Hook to manage datasources query parameters in the URL
 */
export const useDatasourcesParams = () => {
    return useQueryStates(datasourcesParams)
}
