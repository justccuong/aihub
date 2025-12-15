import { createLoader } from "nuqs/server"
import { datasourceGroupsParams, datasourceGroupsQuerySchema } from "../params"
import { SearchParams } from "nuqs/server"

const baseLoader = createLoader(datasourceGroupsParams)

export const datasourceGroupsParamsLoader = async (searchParams: Promise<SearchParams>) => {
    const parsed = await baseLoader(searchParams)
    return datasourceGroupsQuerySchema.parse(parsed)
}
