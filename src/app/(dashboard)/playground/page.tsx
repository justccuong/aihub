import { PlaygroundContainer } from "@/features/playground"
import { HydrateClient, prefetch } from "@/lib/api/hydrate-client"
import { requireAuth } from "@/lib/auth/utils"
import { agentsListQueryOptions } from "@/features/agents/query-options"
import { Suspense } from "react"
import { ErrorBoundary } from "react-error-boundary"
import { PlaygroundError, PlaygroundLoading } from "@/features/playground/components/playground-container"

export default async function PlaygroundPage() {
    await requireAuth()

    // Prefetch agents list for the selector
    // prefetch(agentsListQueryOptions({
    //     page: 1,
    //     pageSize: 20,
    //     search: "",
    //     sortBy: "name",
    //     sortOrder: "asc",
    // }))

    return (
        <HydrateClient>
            <div className="h-[100dvh] flex flex-col">
                <ErrorBoundary fallback={<PlaygroundError />}>
                    <Suspense fallback={<PlaygroundLoading />}>
                        <PlaygroundContainer />
                    </Suspense>
                </ErrorBoundary>
            </div>
        </HydrateClient>
    )
}
