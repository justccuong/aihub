import { agentsListQueryOptions, agentsParamsLoader, AgentContainer, AgentError, AgentList, AgentLoading } from "@/features/agents"
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
    const searchParamsResolved = await agentsParamsLoader(searchParams)
    prefetch(agentsListQueryOptions(searchParamsResolved))

    return (
        <AgentContainer>
            <HydrateClient>
                <ErrorBoundary fallback={<AgentError />}>
                    <Suspense fallback={<AgentLoading />}>
                        <AgentList />
                    </Suspense>
                </ErrorBoundary>
            </HydrateClient>
        </AgentContainer>
    )
}
