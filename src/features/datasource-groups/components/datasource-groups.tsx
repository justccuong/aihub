"use client"

import {
    EntityContainer,
    EntityEmptyView,
    EntityHeader,
    EntityItem,
    EntityList,
    EntityPagination,
    EntitySearch,
    EntityStateView,
} from "@/components/entity-components"
import { useDatasourceGroupsList, useDeleteDatasourceGroup } from "../hooks/use-datasource-groups"
import { useDatasourceGroupsParams } from "../hooks/use-datasource-groups-params"
import { useEntitySearch } from "@/hooks/use-entity-search"
import { Spinner } from "@/components/ui/spinner"
import { AlertTriangleIcon, DatabaseIcon, FolderIcon, PackageOpenIcon } from "lucide-react"
import { useState } from "react"
import { DatasourceGroupsDialog } from "./datasource-groups-dialog"
import { honoClient } from "@/lib/api/hono-client"
import { InferResponseType } from "hono/client"

type DatasourceGroupsSuccessResponse = InferResponseType<typeof honoClient.api['datasource-groups']['$get'], 200>
type DatasourceGroupItem = DatasourceGroupsSuccessResponse["data"][number]

export const DatasourceGroupList = () => {
    const [params, setParams] = useDatasourceGroupsParams()
    const { data, isFetching } = useDatasourceGroupsList(params)
    const deleteDatasourceGroup = useDeleteDatasourceGroup()
    const [editItem, setEditItem] = useState<DatasourceGroupItem | null>(null)
    const [dialogOpen, setDialogOpen] = useState(false)

    const handleEdit = (item: DatasourceGroupItem) => {
        setEditItem(item)
        setDialogOpen(true)
    }

    const handleClose = () => {
        setDialogOpen(false)
        setEditItem(null)
    }

    const items = (data?.data || []) as DatasourceGroupItem[]
    const pagination = data?.pagination

    return (
        <>
            <EntityList
                items={items}
                getKey={(item) => item.id}
                emptyView={<DatasourceGroupEmpty />}
                isPending={isFetching}
                renderItem={(item) => (
                    <EntityItem
                        href={`/datasources/${item.id}`}
                        title={item.name}
                        subtitle={
                            <span className="flex items-center gap-1.5">
                                <DatabaseIcon className="size-3" />
                                {item.description || "No description"}
                            </span>
                        }
                        image={
                            <div className="size-10 bg-primary/10 rounded-lg flex items-center justify-center">
                                <FolderIcon className="size-5 text-primary" />
                            </div>
                        }
                        onEdit={() => handleEdit(item)}
                        onRemove={() => deleteDatasourceGroup.mutate(item.id)}
                        isRemoving={deleteDatasourceGroup.isPending}
                    />
                )}
            />
            {pagination && pagination.totalPages > 1 && (
                <EntityPagination
                    page={pagination.page}
                    totalPages={pagination.totalPages}
                    onPageChange={(page) => setParams({ ...params, page })}
                />
            )}
            <DatasourceGroupsDialog
                open={dialogOpen}
                onOpenChange={handleClose}
                editItem={editItem}
            />
        </>
    )
}

export const DatasourceGroupHeader = ({ disabled }: { disabled?: boolean }) => {
    const [dialogOpen, setDialogOpen] = useState(false)

    return (
        <>
            <EntityHeader
                title="Datasource Groups"
                description="Manage your datasource group configurations"
                onNew={() => setDialogOpen(true)}
                newButtonLabel="Add Group"
                disabled={disabled}
            />
            <DatasourceGroupsDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
            />
        </>
    )
}

export const DatasourceGroupSearch = () => {
    const [params, setParams] = useDatasourceGroupsParams()
    const { searchValue, onSearchChange } = useEntitySearch({
        params,
        setParams,
    })

    return (
        <EntitySearch
            value={searchValue}
            onChange={onSearchChange}
            placeholder="Search datasource groups..."
        />
    )
}

export const DatasourceGroupContainer = ({
    children,
}: {
    children: React.ReactNode
}) => {
    return (
        <EntityContainer
            header={<DatasourceGroupHeader />}
            search={<DatasourceGroupSearch />}
        >
            {children}
        </EntityContainer>
    )
}

export const DatasourceGroupLoading = () => {
    return (
        <EntityStateView
            icon={<Spinner className="size-6" />}
            title="Loading datasource groups..."
        />
    )
}

export const DatasourceGroupError = () => {
    return (
        <EntityStateView
            icon={<AlertTriangleIcon className="size-6 text-orange-600" />}
            title="Error loading datasource groups"
        />
    )
}

export const DatasourceGroupEmpty = () => {
    const [dialogOpen, setDialogOpen] = useState(false)

    return (
        <>
            <EntityEmptyView
                icon={<PackageOpenIcon className="size-6" />}
                title="No Datasource Groups"
                message="Add your first datasource group to organize your data sources."
                onNews={() => setDialogOpen(true)}
                newLabel="Add Group"
            />
            <DatasourceGroupsDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
            />
        </>
    )
}
