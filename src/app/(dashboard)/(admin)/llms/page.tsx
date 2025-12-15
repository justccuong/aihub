import { llmsListQueryOptions } from "@/features/llms/query-options"
import { llmsParamsLoader } from "@/features/llms/server/params-loader"
import { prefetch } from "@/lib/api/hydrate-client"
import { requireAuth } from "@/lib/auth/utils"
import { SearchParams } from "nuqs/server"
import ClientPage from "./client-page"

type Props = {
    searchParams: Promise<SearchParams>
}
export default async function Page({ searchParams }: Props) {
    await requireAuth()
    const searchParamsResolved = await llmsParamsLoader(searchParams)
    prefetch(llmsListQueryOptions(searchParamsResolved))
    return (
        <div>
            <ClientPage />
        </div>
    )
}
