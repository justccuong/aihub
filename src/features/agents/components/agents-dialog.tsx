"use client"

import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery } from "@tanstack/react-query"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
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
import { Check, ChevronsUpDown } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Slider } from "@/components/ui/slider"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MultiSelect } from "@/components/ui/multi-select"
import { useCreateAgent, useUpdateAgent } from "../hooks/use-agents"
import { useEffect } from "react"
import { honoClient } from "@/lib/api/hono-client"
import { InferResponseType } from "hono/client"
import { createAgentSchema } from "../server/routers"
import { llmsListQueryOptions } from "@/features/llms/query-options"
import { datasourceGroupsListQueryOptions } from "@/features/datasource-groups/query-options"
import { Spinner } from "@/components/ui/spinner"

// Use a simpler form schema for local form state
const agentFormSchema = z.object({
    name: z.string().min(1, 'Name is required').max(255),
    description: z.string().default(''),
    systemPrompt: z.string().default(''),
    topK: z.number().int().min(1).max(100).default(40),
    temperature: z.number().int().min(0).max(100).default(70),
    maxTokens: z.number().int().min(1).max(32000).default(1024),
    llmId: z.number().int().positive().optional(),
    datasourceGroupIds: z.array(z.number().int().positive()).default([]),
})

type AgentFormValues = z.infer<typeof agentFormSchema>
type AgentsSuccessResponse = InferResponseType<typeof honoClient.api.agents.$get, 200>
type AgentItem = AgentsSuccessResponse["data"][number]

interface AgentsDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    editItem?: AgentItem | null
}

export const AgentsDialog = ({
    open,
    onOpenChange,
    editItem,
}: AgentsDialogProps) => {
    const createMutation = useCreateAgent()
    const updateMutation = useUpdateAgent()
    const isEditing = !!editItem

    // Fetch LLMs for selection
    const { data: llmsData, isLoading: llmsLoading } = useQuery({
        ...llmsListQueryOptions({ page: 1, pageSize: 100, search: "", sortBy: "name", sortOrder: "asc" }),
        enabled: open,
    })

    // Fetch datasource groups for multi-select
    const { data: datasourceGroupsData, isLoading: datasourceGroupsLoading } = useQuery({
        ...datasourceGroupsListQueryOptions({ page: 1, pageSize: 100, search: "", sortBy: "name", sortOrder: "asc" }),
        enabled: open,
    })

    const form = useForm<AgentFormValues>({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: zodResolver(agentFormSchema) as any,
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

    useEffect(() => {
        if (editItem) {
            form.reset({
                name: editItem.name,
                description: editItem.description || "",
                systemPrompt: editItem.systemPrompt || "",
                topK: editItem.topK ?? 40,
                temperature: editItem.temperature ?? 70,
                maxTokens: editItem.maxTokens ?? 1024,
                llmId: editItem.llmId ?? undefined,
                datasourceGroupIds: editItem.datasourceGroups?.map((g: { id: number }) => g.id) || [],
            })
        } else {
            form.reset({
                name: "",
                description: "",
                systemPrompt: "",
                topK: 40,
                temperature: 70,
                maxTokens: 1024,
                llmId: undefined,
                datasourceGroupIds: [],
            })
        }
    }, [editItem, form])

    const onSubmit = async (values: AgentFormValues) => {
        const payload = {
            name: values.name,
            description: values.description || undefined,
            systemPrompt: values.systemPrompt || undefined,
            topK: values.topK,
            temperature: values.temperature,
            maxTokens: values.maxTokens,
            llmId: values.llmId,
            datasourceGroupIds: values.datasourceGroupIds,
        }

        if (isEditing && editItem) {
            updateMutation.mutate(
                { id: editItem.id, data: payload },
                {
                    onSuccess: () => {
                        form.reset()
                        onOpenChange(false)
                    },
                }
            )
        } else {
            createMutation.mutate(payload, {
                onSuccess: () => {
                    form.reset()
                    onOpenChange(false)
                },
            })
        }
    }

    const handleOpenChange = (open: boolean) => {
        if (!open) {
            form.reset()
        }
        onOpenChange(open)
    }

    const isPending = createMutation.isPending || updateMutation.isPending

    const llms = llmsData?.data || []
    const datasourceGroups = datasourceGroupsData?.data || []

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle>
                        {isEditing ? "Edit Agent" : "Add Agent"}
                    </DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
                        <ScrollArea className="flex-1 pr-4">
                            <div className="space-y-4 pb-4">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Name *</FormLabel>
                                            <FormControl>
                                                <Input placeholder="e.g., Customer Support Agent" {...field} />
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
                                                    rows={4}
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormDescription>
                                                Instructions that define the agent's behavior
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
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
                                                <Popover>
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
                                                                    ? llms.find(
                                                                        (llm) => llm.id === field.value
                                                                    )?.name
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
                                <div className="grid grid-cols-3 gap-4">
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
                        <DialogFooter className="pt-4 border-t mt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                disabled={isPending}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isPending}>
                                {isPending ? "Saving..." : isEditing ? "Update" : "Create"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
