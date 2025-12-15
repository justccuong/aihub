import { llmsListQueryOptions, llmsParamsLoader, LlmContainer, LlmError, LlmList, LlmLoading } from "@/features/llms"
import { HydrateClient, prefetch } from "@/lib/api/hydrate-client"
import { requireAuth } from "@/lib/auth/utils"
import { SearchParams } from "nuqs/server"
import { ErrorBoundary } from "react-error-boundary"
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
            <HydrateClient>
                <ErrorBoundary fallback={<LlmError />}>
                    <Suspense fallback={<LlmLoading />}>
                        <LlmList />
                    </Suspense>
                </ErrorBoundary>
            </HydrateClient>
        </LlmContainer>
    )
}
