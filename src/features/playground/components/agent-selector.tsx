"use client"

import { useQuery } from "@tanstack/react-query"
import { Check, ChevronsUpDown, BotIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { agentsListQueryOptions } from "@/features/agents/query-options"
import { usePlaygroundParams } from "../hooks/use-playground-params"
import { useState } from "react"
import { Spinner } from "@/components/ui/spinner"

export const AgentSelector = () => {
    const [open, setOpen] = useState(false)
    const [agentId, setAgentId] = usePlaygroundParams()

    const { data, isLoading } = useQuery(
        agentsListQueryOptions({
            page: 1,
            pageSize: 100,
            search: "",
            sortBy: "name",
            sortOrder: "asc",
        })
    )

    const agents = data?.data || []
    const selectedAgent = agents.find((agent) => agent.id === agentId)

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between"
                >
                    {isLoading ? (
                        <div className="flex items-center gap-2">
                            <Spinner className="size-4" />
                            <span>Loading agents...</span>
                        </div>
                    ) : selectedAgent ? (
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div className="size-6 bg-primary/10 rounded flex items-center justify-center shrink-0">
                                <BotIcon className="size-3.5 text-primary" />
                            </div>
                            <span className="truncate">{selectedAgent.name}</span>
                            {selectedAgent.llmName && (
                                <span className="text-xs text-muted-foreground truncate hidden sm:inline">
                                    ({selectedAgent.llmName})
                                </span>
                            )}
                        </div>
                    ) : (
                        <span className="text-muted-foreground">Select an agent...</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                    <CommandInput placeholder="Search agents..." />
                    <CommandList>
                        <CommandEmpty>No agent found.</CommandEmpty>
                        <CommandGroup>
                            {agents.map((agent) => (
                                <CommandItem
                                    key={agent.id}
                                    value={agent.name}
                                    onSelect={() => {
                                        setAgentId(agent.id)
                                        setOpen(false)
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            agentId === agent.id
                                                ? "opacity-100"
                                                : "opacity-0"
                                        )}
                                    />
                                    <div className="flex items-center gap-2">
                                        <div className="size-6 bg-primary/10 rounded flex items-center justify-center">
                                            <BotIcon className="size-3.5 text-primary" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span>{agent.name}</span>
                                            {agent.llmName && (
                                                <span className="text-xs text-muted-foreground">
                                                    {agent.llmName}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
