"use client"

import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useSuspenseQuery, useQuery } from "@tanstack/react-query"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
} from "@/components/ui/form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
import { Check, ChevronsUpDown, SaveIcon, BotIcon } from "lucide-react"
import { Slider } from "@/components/ui/slider"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MultiSelect } from "@/components/ui/multi-select"
import { useUpdateAgent, useToggleAgent } from "@/features/agents/hooks/use-agents"
import { useEffect, useState } from "react"
import { agentDetailQueryOptions } from "@/features/agents/query-options"
import { llmsListQueryOptions } from "@/features/llms/query-options"
import { datasourceGroupsListQueryOptions } from "@/features/datasource-groups/query-options"
import { Spinner } from "@/components/ui/spinner"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"

// Schema for config form (subset of agent fields that are editable in playground)
const configFormSchema = z.object({
    name: z.string().min(1, "Name is required").max(255),
    description: z.string().default(""),
    systemPrompt: z.string().default(""),
    topK: z.number().int().min(1).max(100).default(40),
    temperature: z.number().int().min(0).max(100).default(70),
    maxTokens: z.number().int().min(1).max(32000).default(1024),
    llmId: z.number().int().positive().optional(),
    datasourceGroupIds: z.array(z.number().int().positive()).default([]),
})

type ConfigFormValues = z.infer<typeof configFormSchema>

export interface AgentConfigPanelProps {
    agentId: number
    onConfigChange?: (config: Partial<ConfigFormValues>) => void
    onLoadingChange?: (isLoading: boolean) => void
}

export const AgentConfigPanel = ({ agentId, onConfigChange, onLoadingChange }: AgentConfigPanelProps) => {
    const [llmPopoverOpen, setLlmPopoverOpen] = useState(false)
    const updateMutation = useUpdateAgent()
    const toggleAgent = useToggleAgent()

    const { data: agentData, isFetching: agentFetching } = useSuspenseQuery(agentDetailQueryOptions(agentId))
    const { data: llmsData, isLoading: llmsLoading } = useQuery({
        ...llmsListQueryOptions({ page: 1, pageSize: 100, search: "", sortBy: "name", sortOrder: "asc" }),
    })

    // Fetch datasource groups for multi-select
    const { data: datasourceGroupsData, isLoading: datasourceGroupsLoading } = useQuery({
        ...datasourceGroupsListQueryOptions({ page: 1, pageSize: 100, search: "", sortBy: "name", sortOrder: "asc" }),
    })

    // Notify parent about loading state
    const isLoading = agentFetching || llmsLoading || datasourceGroupsLoading
    useEffect(() => {
        onLoadingChange?.(isLoading)
    }, [isLoading, onLoadingChange])

    const agent = agentData?.data
    const llms = llmsData?.data || []
    const datasourceGroups = datasourceGroupsData?.data || []

    const form = useForm<ConfigFormValues>({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: zodResolver(configFormSchema) as any,
        defaultValues: {
            name: "",
            description: "",
            systemPrompt: "",
            topK: 40,
            temperature: 70,
            maxTokens: 1024,
            llmId: undefined,
            datasourceGroupIds: [],
        },
    })

    // Reset form when agent data changes
    useEffect(() => {
        if (agent) {
            const configValues = {
                name: agent.name,
                description: agent.description || "",
                systemPrompt: agent.systemPrompt || "",
                topK: agent.topK ?? 40,
                temperature: agent.temperature ?? 70,
                maxTokens: agent.maxTokens ?? 1024,
                llmId: agent.llm?.id ?? undefined,
                datasourceGroupIds: agent.datasourceGroups?.map((g: { id: number }) => g.id) || [],
            }
            form.reset(configValues)
            // Notify parent of initial config values
            onConfigChange?.(configValues)
        }
    }, [agent, form, onConfigChange])

    // Watch form values and notify parent of changes
    useEffect(() => {
        const subscription = form.watch((values) => {
            onConfigChange?.(values as Partial<ConfigFormValues>)
        })
        return () => subscription.unsubscribe()
    }, [form, onConfigChange])

    const onSubmit = async (values: ConfigFormValues) => {
        if (!agent) return

        updateMutation.mutate({
            id: agent.id,
            data: {
                name: values.name,
                description: values.description || undefined,
                systemPrompt: values.systemPrompt || undefined,
                topK: values.topK,
                temperature: values.temperature,
                maxTokens: values.maxTokens,
                llmId: values.llmId,
                datasourceGroupIds: values.datasourceGroupIds,
            },
        })
    }

    if (!agent) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center text-muted-foreground">
                    <p>Agent not found</p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header with toggle */}
            <div className="p-4 border-b flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={`size-10 rounded-lg flex items-center justify-center ${agent.isEnabled ? 'bg-primary/10' : 'bg-muted'}`}>
                        <BotIcon className={`size-5 ${agent.isEnabled ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <div>
                        <h3 className="font-semibold">{agent.name}</h3>
                        <Badge variant={agent.isEnabled ? 'default' : 'secondary'} className="text-xs">
                            {agent.isEnabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                    </div>
                </div>
                <Switch
                    checked={agent.isEnabled}
                    onCheckedChange={() => toggleAgent.mutate(agentId)}
                    disabled={toggleAgent.isPending}
                />
            </div>
            {/* Form */}
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
                    <ScrollArea className="flex-1">
                        <div className="p-4 space-y-4">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Agent name" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Description</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="Optional description..."
                                                rows={2}
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="systemPrompt"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>System Prompt</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="You are a helpful assistant..."
                                                rows={6}
                                                className="text-xs max-h-40 overflow-y-auto resize-none"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            Instructions that define the agent&apos;s behavior
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <Separator />

                            <FormField
                                control={form.control}
                                name="llmId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>LLM</FormLabel>
                                        {llmsLoading ? (
                                            <div className="flex items-center gap-2 py-2">
                                                <Spinner className="size-4" />
                                                <span className="text-sm text-muted-foreground">Loading LLMs...</span>
                                            </div>
                                        ) : (
                                            <Popover open={llmPopoverOpen} onOpenChange={setLlmPopoverOpen}>
                                                <PopoverTrigger asChild>
                                                    <FormControl>
                                                        <Button
                                                            variant="outline"
                                                            role="combobox"
                                                            className={cn(
                                                                "w-full justify-between",
                                                                !field.value && "text-muted-foreground"
                                                            )}
                                                        >
                                                            {field.value
                                                                ? llms.find((llm) => llm.id === field.value)?.name
                                                                : "Select an LLM"}
                                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                        </Button>
                                                    </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                                    <Command>
                                                        <CommandInput placeholder="Search LLM..." />
                                                        <CommandList>
                                                            <CommandEmpty>No LLM found.</CommandEmpty>
                                                            <CommandGroup>
                                                                {llms.map((llm) => (
                                                                    <CommandItem
                                                                        value={llm.name}
                                                                        key={llm.id}
                                                                        onSelect={() => {
                                                                            form.setValue("llmId", llm.id)
                                                                            setLlmPopoverOpen(false)
                                                                        }}
                                                                    >
                                                                        <Check
                                                                            className={cn(
                                                                                "mr-2 h-4 w-4",
                                                                                llm.id === field.value
                                                                                    ? "opacity-100"
                                                                                    : "opacity-0"
                                                                            )}
                                                                        />
                                                                        {llm.name}
                                                                        <span className="ml-2 text-muted-foreground text-xs">
                                                                            ({llm.provider}/{llm.model})
                                                                        </span>
                                                                    </CommandItem>
                                                                ))}
                                                            </CommandGroup>
                                                        </CommandList>
                                                    </Command>
                                                </PopoverContent>
                                            </Popover>
                                        )}
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <Separator />

                            <div className="space-y-4">
                                <h3 className="text-sm font-medium">Model Parameters</h3>

                                <FormField
                                    control={form.control}
                                    name="temperature"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Temperature: {(field.value || 70) / 100}</FormLabel>
                                            <FormControl>
                                                <Slider
                                                    min={0}
                                                    max={100}
                                                    step={1}
                                                    value={[field.value || 70]}
                                                    onValueChange={(v) => field.onChange(v[0])}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="topK"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Top K: {field.value || 40}</FormLabel>
                                            <FormControl>
                                                <Slider
                                                    min={1}
                                                    max={100}
                                                    step={1}
                                                    value={[field.value || 40]}
                                                    onValueChange={(v) => field.onChange(v[0])}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="maxTokens"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Max Tokens</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    min={1}
                                                    max={32000}
                                                    {...field}
                                                    onChange={(e) => field.onChange(Number(e.target.value))}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <Separator />

                            <FormField
                                control={form.control}
                                name="datasourceGroupIds"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Datasource Groups</FormLabel>
                                        <FormDescription>
                                            Select the datasource groups this agent can access
                                        </FormDescription>
                                        <FormControl>
                                            <MultiSelect
                                                options={datasourceGroups.map((group) => ({
                                                    label: group.name,
                                                    value: String(group.id),
                                                }))}
                                                onValueChange={(values) => {
                                                    field.onChange(values.map(Number))
                                                }}
                                                defaultValue={field.value.map(String)}
                                                placeholder="Select datasource groups"
                                                searchable
                                                maxCount={5}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </ScrollArea>

                    {/* Footer */}
                    <div className="p-4 border-t">
                        <Button
                            type="submit"
                            className="w-full"
                            disabled={updateMutation.isPending || !form.formState.isDirty}
                        >
                            {updateMutation.isPending ? (
                                <>
                                    <Spinner className="size-4 mr-2" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <SaveIcon className="size-4 mr-2" />
                                    Save Changes
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    )
}
