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
import { useLlmsList, useDeleteLlm } from "../hooks/use-llms"
import { useLlmsParams } from "../hooks/use-llms-params"
import { useEntitySearch } from "@/hooks/use-entity-search"
import { Spinner } from "@/components/ui/spinner"
import { AlertTriangleIcon, BotIcon, CpuIcon, PackageOpenIcon } from "lucide-react"
import { useState } from "react"
import { LlmsDialog } from "./llms-dialog"
import { honoClient } from "@/lib/api/hono-client"
import { InferResponseType } from "hono/client"

type LlmsSuccessResponse = InferResponseType<typeof honoClient.api.llms.$get, 200>
type LlmItem = LlmsSuccessResponse["data"][number]

export const LlmList = () => {
    const [params, setParams] = useLlmsParams()
    const { data, isLoading, isError } = useLlmsList(params)
    const deleteLlm = useDeleteLlm()
    const [editItem, setEditItem] = useState<LlmItem | null>(null)
    const [dialogOpen, setDialogOpen] = useState(false)

    const handleEdit = (item: LlmItem) => {
        setEditItem(item)
        setDialogOpen(true)
    }

    const handleClose = () => {
        setDialogOpen(false)
        setEditItem(null)
    }

    if (isLoading) {
        return <LlmLoading />
    }

    if (isError) {
        return <LlmError />
    }

    const items = data?.data || []
    const pagination = data?.pagination

    return (
        <>
            <EntityList
                items={items}
                getKey={(item) => item.id}
                emptyView={<LlmEmpty />}
                renderItem={(item) => (
                    <EntityItem
                        href="#"
                        title={item.name}
                        subtitle={
                            <span className="flex items-center gap-1.5">
                                <CpuIcon className="size-3" />
                                {item.provider} / {item.model}
                            </span>
                        }
                        image={
                            <div className="size-10 bg-primary/10 rounded-lg flex items-center justify-center">
                                <BotIcon className="size-5 text-primary" />
                            </div>
                        }
                        onRemove={() => deleteLlm.mutate(item.id)}
                        isRemoving={deleteLlm.isPending}
                        onClick={(e) => {
                            e.preventDefault()
                            handleEdit(item)
                        }}
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
            <LlmsDialog
                open={dialogOpen}
                onOpenChange={handleClose}
                editItem={editItem}
            />
        </>
    )
}

export const LlmHeader = ({ disabled }: { disabled?: boolean }) => {
    const [dialogOpen, setDialogOpen] = useState(false)

    return (
        <>
            <EntityHeader
                title="LLMs"
                description="Manage your language model configurations"
                onNew={() => setDialogOpen(true)}
                newButtonLabel="Add LLM"
                disabled={disabled}
            />
            <LlmsDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
            />
        </>
    )
}

export const LlmSearch = () => {
    const [params, setParams] = useLlmsParams()
    const { searchValue, onSearchChange } = useEntitySearch({
        params,
        setParams,
    })

    return (
        <EntitySearch
            value={searchValue}
            onChange={onSearchChange}
            placeholder="Search LLMs..."
        />
    )
}

export const LlmContainer = ({
    children,
}: {
    children: React.ReactNode
}) => {
    return (
        <EntityContainer
            header={<LlmHeader />}
            search={<LlmSearch />}
        >
            {children}
        </EntityContainer>
    )
}

export const LlmLoading = () => {
    return (
        <EntityStateView
            icon={<Spinner className="size-6" />}
            title="Loading LLMs..."
        />
    )
}

export const LlmError = () => {
    return (
        <EntityStateView
            icon={<AlertTriangleIcon className="size-6 text-orange-600" />}
            title="Error loading LLMs"
        />
    )
}

export const LlmEmpty = () => {
    const [dialogOpen, setDialogOpen] = useState(false)

    return (
        <>
            <EntityEmptyView
                icon={<PackageOpenIcon className="size-6" />}
                title="No LLMs"
                message="Add your first language model configuration."
                onNews={() => setDialogOpen(true)}
                newLabel="Add LLM"
            />
            <LlmsDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
            />
        </>
    )
}
