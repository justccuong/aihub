"use client"

import { useQueryState } from "nuqs"
import { playgroundParams } from "../params"

/**
 * Hook for managing playground agentId URL search param
 */
export const usePlaygroundParams = () => {
    return useQueryState('agentId', playgroundParams.agentId)
}
