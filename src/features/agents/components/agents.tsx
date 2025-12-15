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
import { useAgentsList, useDeleteAgent } from "../hooks/use-agents"
import { useAgentsParams } from "../hooks/use-agents-params"
import { useEntitySearch } from "@/hooks/use-entity-search"
import { Spinner } from "@/components/ui/spinner"
import { AlertTriangleIcon, BotIcon, PackageOpenIcon, DatabaseIcon } from "lucide-react"
import { useState } from "react"
import { AgentsDialog } from "./agents-dialog"
import { honoClient } from "@/lib/api/hono-client"
import { InferResponseType } from "hono/client"
import { Badge } from "@/components/ui/badge"

type AgentsSuccessResponse = InferResponseType<typeof honoClient.api.agents.$get, 200>
type AgentItem = AgentsSuccessResponse["data"][number]

export const AgentList = () => {
    const [params, setParams] = useAgentsParams()
    const { data, isFetching } = useAgentsList(params)
    const deleteAgent = useDeleteAgent()
    const [editItem, setEditItem] = useState<AgentItem | null>(null)
    const [dialogOpen, setDialogOpen] = useState(false)

    const handleEdit = (item: AgentItem) => {
        setEditItem(item)
        setDialogOpen(true)
    }

    const handleClose = () => {
        setDialogOpen(false)
        setEditItem(null)
    }

    const items = data?.data || []
    const pagination = data?.pagination

    return (
        <>
            <EntityList
                items={items}
                getKey={(item) => item.id}
                emptyView={<AgentEmpty />}
                isPending={isFetching}
                renderItem={(item) => (
                    <EntityItem
                        href="#"
                        title={item.name}
                        subtitle={
                            <div className="flex flex-col gap-1">
                                {item.llmName && (
                                    <span className="text-xs text-muted-foreground">
                                        LLM: {item.llmName}
                                    </span>
                                )}
                                {item.datasourceGroups && item.datasourceGroups.length > 0 && (
                                    <div className="flex items-center gap-1 flex-wrap">
                                        <DatabaseIcon className="size-3 text-muted-foreground" />
                                        {item.datasourceGroups.slice(0, 3).map((g) => (
                                            <Badge key={g.id} variant="secondary" className="text-[10px] px-1.5 py-0">
                                                {g.name}
                                            </Badge>
                                        ))}
                                        {item.datasourceGroups.length > 3 && (
                                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                                +{item.datasourceGroups.length - 3}
                                            </Badge>
                                        )}
                                    </div>
                                )}
                            </div>
                        }
                        image={
                            <div className="size-10 bg-primary/10 rounded-lg flex items-center justify-center">
                                <BotIcon className="size-5 text-primary" />
                            </div>
                        }
                        onEdit={() => handleEdit(item)}
                        onRemove={() => deleteAgent.mutate(item.id)}
                        isRemoving={deleteAgent.isPending}
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
            <AgentsDialog
                open={dialogOpen}
                onOpenChange={handleClose}
                editItem={editItem}
            />
        </>
    )
}

export const AgentHeader = ({ disabled }: { disabled?: boolean }) => {
    const [dialogOpen, setDialogOpen] = useState(false)

    return (
        <>
            <EntityHeader
                title="Agents"
                description="Manage your AI agents and their configurations"
                onNew={() => setDialogOpen(true)}
                newButtonLabel="Add Agent"
                disabled={disabled}
            />
            <AgentsDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
            />
        </>
    )
}

export const AgentSearch = () => {
    const [params, setParams] = useAgentsParams()
    const { searchValue, onSearchChange } = useEntitySearch({
        params,
        setParams,
    })

    return (
        <EntitySearch
            value={searchValue}
            onChange={onSearchChange}
            placeholder="Search agents..."
        />
    )
}

export const AgentContainer = ({
    children,
}: {
    children: React.ReactNode
}) => {
    return (
        <EntityContainer
            header={<AgentHeader />}
            search={<AgentSearch />}
        >
            {children}
        </EntityContainer>
    )
}

export const AgentLoading = () => {
    return (
        <EntityStateView
            icon={<Spinner className="size-6" />}
            title="Loading agents..."
        />
    )
}

export const AgentError = () => {
    return (
        <EntityStateView
            icon={<AlertTriangleIcon className="size-6 text-orange-600" />}
            title="Error loading agents"
        />
    )
}

export const AgentEmpty = () => {
    const [dialogOpen, setDialogOpen] = useState(false)

    return (
        <>
            <EntityEmptyView
                icon={<PackageOpenIcon className="size-6" />}
                title="No agents"
                message="Add your first AI agent configuration."
                onNews={() => setDialogOpen(true)}
                newLabel="Add Agent"
            />
            <AgentsDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
            />
        </>
    )
}
