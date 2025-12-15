"use client"

import { useQueryStates } from "nuqs"
import { agentsParams } from "../params"

/**
 * Hook for managing agents URL search params
 */
export const useAgentsParams = () => {
    return useQueryStates(agentsParams)
}
