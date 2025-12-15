import { createLoader } from "nuqs/server"
import { llmsParams, llmsQuerySchema } from "../params"
import { SearchParams } from "nuqs/server"

const baseLoader = createLoader(llmsParams)

export const llmsParamsLoader = async (searchParams: Promise<SearchParams>) => {
    const parsed = await baseLoader(searchParams)
    return llmsQuerySchema.parse(parsed)
}
