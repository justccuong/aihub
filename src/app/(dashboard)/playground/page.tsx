import { PlaygroundContainer } from "@/features/playground"
import { HydrateClient, prefetch } from "@/lib/api/hydrate-client"
import { requireAuth } from "@/lib/auth/utils"
import { agentsListQueryOptions } from "@/features/agents/query-options"
import { Suspense } from "react"
import { ErrorBoundary } from "react-error-boundary"
import { Spinner } from "@/components/ui/spinner"
import { BotIcon } from "lucide-react"

const PlaygroundLoading = () => (
    <div className="flex h-full items-center justify-center">
        <Spinner className="size-6" />
    </div>
)

const PlaygroundError = () => (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
        <BotIcon className="size-8" />
        <p className="text-sm">Failed to load playground</p>
    </div>
)

export default async function PlaygroundPage() {
    await requireAuth()

    // Prefetch agents list for the selector
    prefetch(agentsListQueryOptions({
        page: 1,
        pageSize: 20,
        search: "",
        sortBy: "name",
        sortOrder: "asc",
    }))

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
