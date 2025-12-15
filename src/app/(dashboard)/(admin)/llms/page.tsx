import { llmsListQueryOptions } from "@/features/llms/query-options"
import { llmsParamsLoader } from "@/features/llms/server/params-loader"
import { LlmContainer, LlmList, LlmLoading } from "@/features/llms/components/llms"
import { prefetch } from "@/lib/api/hydrate-client"
import { requireAuth } from "@/lib/auth/utils"
import { SearchParams } from "nuqs/server"
import { Suspense } from "react"

type Props = {
    searchParams: Promise<SearchParams>
}

export default async function Page({ searchParams }: Props) {
    await requireAuth()
    const searchParamsResolved = await llmsParamsLoader(searchParams)
    prefetch(llmsListQueryOptions(searchParamsResolved))

    return (
        <LlmContainer>
            <Suspense fallback={<LlmLoading />}>
                <LlmList />
            </Suspense>
        </LlmContainer>
    )
}
