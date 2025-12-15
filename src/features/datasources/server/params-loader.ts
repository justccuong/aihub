import { createLoader } from "nuqs/server"
import { datasourcesParams, datasourcesQuerySchema } from "../params"
import { SearchParams } from "nuqs/server"

const baseLoader = createLoader(datasourcesParams)

export const datasourcesParamsLoader = async (searchParams: Promise<SearchParams>) => {
    const parsed = await baseLoader(searchParams)
    return datasourcesQuerySchema.parse(parsed)
}
