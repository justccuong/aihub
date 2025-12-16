import { PlaygroundContainer } from "@/features/playground"
import { HydrateClient, prefetch } from "@/lib/api/hydrate-client"
import { requireAuth } from "@/lib/auth/utils"
import { agentsListQueryOptions } from "@/features/agents/query-options"

export default async function PlaygroundPage() {
    await requireAuth()

    // Prefetch agents list for the selector
    prefetch(agentsListQueryOptions({
        page: 1,
        pageSize: 100,
        search: "",
        sortBy: "name",
        sortOrder: "asc",
    }))

    return (
        <HydrateClient>
            <div className="h-[100dvh] flex flex-col">
                {/* <PlaygroundContainer /> */}
                Playground page
            </div>
        </HydrateClient>
    )
}
