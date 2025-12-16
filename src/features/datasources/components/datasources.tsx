"use client"

import {
    EntityContainer,
    EntityEmptyView,
    EntityHeader,
    EntityStateView,
    EntityTable,
    EntityTableRowActions,
    EntitySearch,
    EntityPagination,
} from "@/components/entity-components"
import { useDatasourcesList, useDeleteDatasource } from "../hooks/use-datasources"
import { useDatasourcesParams } from "../hooks/use-datasources-params"
import { useEntitySearch } from "@/hooks/use-entity-search"
import { Spinner } from "@/components/ui/spinner"
import { AlertTriangleIcon, PackageOpenIcon } from "lucide-react"
import { useState } from "react"
import { DatasourcesDialog } from "./datasources-dialog"
import { honoClient } from "@/lib/api/hono-client"
import { InferResponseType } from "hono/client"
import { ColumnDef } from "@tanstack/react-table"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useParams } from "next/navigation"
import { DatasourceParams } from "../params"

type DatasourcesSuccessResponse = InferResponseType<typeof honoClient.api.datasources.group[':groupId']['$get'], 200>
type DatasourceItem = DatasourcesSuccessResponse["data"][number]

export const DatasourcesList = () => {
    const params = useParams<DatasourceParams>()
    const groupId = parseInt(params.id ?? '', 10)

    const [queryParams, setQueryParams] = useDatasourcesParams()
    const { data, isFetching } = useDatasourcesList(groupId, queryParams)
    const deleteDatasource = useDeleteDatasource()
    const [editItem, setEditItem] = useState<DatasourceItem | null>(null)
    const [dialogOpen, setDialogOpen] = useState(false)

    const handleEdit = (item: DatasourceItem) => {
        setEditItem(item)
        setDialogOpen(true)
    }

    const handleClose = () => {
        setDialogOpen(false)
        setEditItem(null)
    }

    const items = (data?.data || []) as DatasourceItem[]
    const pagination = data?.pagination

    const columns: ColumnDef<DatasourceItem>[] = [
        {
            accessorKey: "id",
            header: "ID",
            cell: ({ row }) => (
                <span className="font-mono text-sm text-muted-foreground">
                    #{row.original.id}
                </span>
            ),
            size: 80,
        },
        {
            accessorKey: "content",
            header: "Content",
            cell: ({ row }) => (
                <div className="max-w-md truncate">
                    {row.original.content}
                </div>
            ),
        },
        {
            id: "actions",
            header: "",
            cell: ({ row }) => (
                <div className="flex justify-end">
                    <EntityTableRowActions
                        onEdit={() => handleEdit(row.original)}
                        onRemove={() => deleteDatasource.mutate(row.original.id)}
                        isRemoving={deleteDatasource.isPending}
                        confirmTitle="Delete this datasource?"
                        confirmDescription="This will permanently delete this datasource and remove it from the vector database."
                    />
                </div>
            ),
            size: 50,
        },
    ]

    return (
        <>
            <EntityTable
                columns={columns}
                data={items}
                emptyView={<DatasourcesEmpty />}
                enablePagination={false}
                isPending={isFetching}
            />
            {pagination && pagination.totalPages > 1 && (
                <EntityPagination
                    page={pagination.page}
                    totalPages={pagination.totalPages}
                    onPageChange={(page) => setQueryParams({ ...queryParams, page })}
                />
            )}
            <DatasourcesDialog
                open={dialogOpen}
                onOpenChange={handleClose}
                editItem={editItem}
            />
        </>
    )
}

export const DatasourcesHeader = ({ disabled }: { disabled?: boolean }) => {
    const params = useParams<DatasourceParams>()
    const groupId = parseInt(params.id ?? '', 10)
    const [queryParams] = useDatasourcesParams()
    const { data } = useDatasourcesList(groupId, queryParams)
    const [dialogOpen, setDialogOpen] = useState(false)

    const groupName = data?.group?.name || "Datasources"

    return (
        <>
            <div className="space-y-2">
                <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" asChild>
                    <Link href="/datasources" prefetch>
                        ← Back to Datasources
                    </Link>
                </Button>
                <EntityHeader
                    title={groupName}
                    description="Manage datasources in this group"
                    onNew={() => setDialogOpen(true)}
                    newButtonLabel="Add Datasource"
                    disabled={disabled}
                />
            </div>
            <DatasourcesDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
            />
        </>
    )
}

export const DatasourcesSearch = () => {
    const [params, setParams] = useDatasourcesParams()
    const { searchValue, onSearchChange } = useEntitySearch({
        params,
        setParams,
    })

    return (
        <EntitySearch
            value={searchValue}
            onChange={onSearchChange}
            placeholder="Search datasources..."
        />
    )
}

export const DatasourcesContainer = ({
    children,
}: {
    children: React.ReactNode
}) => {
    return (
        <EntityContainer
            header={<DatasourcesHeader />}
            search={<DatasourcesSearch />}
        >
            {children}
        </EntityContainer>
    )
}

export const DatasourcesLoading = () => {
    return (
        <EntityStateView
            icon={<Spinner className="size-6" />}
            title="Loading datasources..."
        />
    )
}

export const DatasourcesError = () => {
    return (
        <EntityStateView
            icon={<AlertTriangleIcon className="size-6 text-orange-600" />}
            title="Error loading datasources"
        />
    )
}

export const DatasourcesEmpty = () => {
    const [dialogOpen, setDialogOpen] = useState(false)

    return (
        <>
            <EntityEmptyView
                icon={<PackageOpenIcon className="size-6" />}
                title="No Datasources"
                message="Add your first datasource to this group."
                onNews={() => setDialogOpen(true)}
                newLabel="Add Datasource"
            />
            <DatasourcesDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
            />
        </>
    )
}
