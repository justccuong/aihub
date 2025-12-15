import { datasourcesListQueryOptions, datasourcesParamsLoader, DatasourcesContainer, DatasourcesError, DatasourcesList, DatasourcesLoading, DatasourceParams } from "@/features/datasources"
import { HydrateClient, prefetch } from "@/lib/api/hydrate-client"
import { requireAuth } from "@/lib/auth/utils"
import { SearchParams } from "nuqs/server"
import { ErrorBoundary } from "react-error-boundary"
import { Suspense } from "react"
import { notFound } from "next/navigation"


type Props = {
    params: Promise<DatasourceParams>
    searchParams: Promise<SearchParams>
}

export default async function Page({ params, searchParams }: Props) {
    await requireAuth()

    const { id } = await params
    const groupId = parseInt(id, 10)

    if (isNaN(groupId)) {
        notFound()
    }

    const searchParamsResolved = await datasourcesParamsLoader(searchParams)
    prefetch(datasourcesListQueryOptions(groupId, searchParamsResolved))

    return (
        <DatasourcesContainer>
            <HydrateClient>
                <ErrorBoundary fallback={<DatasourcesError />}>
                    <Suspense fallback={<DatasourcesLoading />}>
                        <DatasourcesList />
                    </Suspense>
                </ErrorBoundary>
            </HydrateClient>
        </DatasourcesContainer>
    )
}
