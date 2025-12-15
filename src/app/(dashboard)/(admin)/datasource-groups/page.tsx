import { datasourceGroupsListQueryOptions, datasourceGroupsParamsLoader, DatasourceGroupContainer, DatasourceGroupError, DatasourceGroupList, DatasourceGroupLoading } from "@/features/datasource-groups"
import { HydrateClient, prefetch } from "@/lib/api/hydrate-client"
import { requireAuth } from "@/lib/auth/utils"
import { SearchParams } from "nuqs/server"
import { Suspense } from "react"
import { ErrorBoundary } from "react-error-boundary"

type Props = {
    searchParams: Promise<SearchParams>
}

export default async function Page({ searchParams }: Props) {
    await requireAuth()
    const searchParamsResolved = await datasourceGroupsParamsLoader(searchParams)
    prefetch(datasourceGroupsListQueryOptions(searchParamsResolved))

    return (
        <DatasourceGroupContainer>
            <HydrateClient>
                <ErrorBoundary fallback={<DatasourceGroupError />}>
                    <Suspense fallback={<DatasourceGroupLoading />}>
                        <DatasourceGroupList />
                    </Suspense>
                </ErrorBoundary>
            </HydrateClient>
        </DatasourceGroupContainer>
    )
}
