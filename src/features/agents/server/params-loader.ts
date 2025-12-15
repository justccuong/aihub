import { createLoader } from "nuqs/server"
import { agentsParams, agentsQuerySchema } from "../params"
import { SearchParams } from "nuqs/server"

const baseLoader = createLoader(agentsParams)

export const agentsParamsLoader = async (searchParams: Promise<SearchParams>) => {
    const parsed = await baseLoader(searchParams)
    return agentsQuerySchema.parse(parsed)
}
