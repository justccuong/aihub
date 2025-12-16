"use client"

import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
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
} from "@/components/ui/form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
    ModelSelector,
    ModelSelectorContent,
    ModelSelectorEmpty,
    ModelSelectorGroup,
    ModelSelectorInput,
    ModelSelectorItem,
    ModelSelectorList,
    ModelSelectorLogo,
    ModelSelectorName,
    ModelSelectorTrigger,
} from "@/components/ai-elements/model-selector"
import { useCreateLlm, useUpdateLlm } from "../hooks/use-llms"
import { useEffect, useState } from "react"
import { honoClient } from "@/lib/api/hono-client"
import { InferResponseType } from "hono/client"
import { createLlmSchema } from "../server/routers"
import {
    getAIModelById,
    getAIModelChefs,
    getAIModelsByChef,
    getAIProviderBySlug,
} from "@/config/constants"
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react"

type LlmFormValues = z.input<typeof createLlmSchema>
type LlmsSuccessResponse = InferResponseType<typeof honoClient.api.llms.$get, 200>
type LlmItem = LlmsSuccessResponse["data"][number]

interface LlmsDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    editItem?: LlmItem | null
}

export const LlmsDialog = ({
    open,
    onOpenChange,
    editItem,
}: LlmsDialogProps) => {
    const createMutation = useCreateLlm()
    const updateMutation = useUpdateLlm()
    const isEditing = !!editItem

    const [modelSelectorOpen, setModelSelectorOpen] = useState(false)

    const form = useForm<LlmFormValues>({
        resolver: zodResolver(createLlmSchema),
        defaultValues: {
            name: "",
            description: "",
            provider: "" as LlmFormValues["provider"],
            model: "",
            baseUrl: "",
            apiKey: "",
        },
    })

    const selectedModel = form.watch("model")
    const selectedModelData = getAIModelById(selectedModel)

    useEffect(() => {
        if (editItem) {
            form.reset({
                name: editItem.name,
                description: editItem.description || "",
                provider: editItem.provider as LlmFormValues["provider"],
                model: editItem.model,
                baseUrl: editItem.baseUrl,
                apiKey: editItem.apiKey,
            })
        } else {
            form.reset({
                name: "",
                description: "",
                provider: "" as LlmFormValues["provider"],
                model: "",
                baseUrl: "",
                apiKey: "",
            })
        }
    }, [editItem, form])

    const handleModelSelect = (modelId: string) => {
        const model = getAIModelById(modelId)
        if (!model) return

        const provider = getAIProviderBySlug(model.chefSlug)
        if (!provider) return

        form.setValue("model", model.id)
        form.setValue("provider", model.chefSlug as LlmFormValues["provider"])
        form.setValue("baseUrl", provider.defaultBaseUrl)
        setModelSelectorOpen(false)
    }

    const onSubmit = async (values: LlmFormValues) => {
        const payload = {
            name: values.name,
            description: values.description || undefined,
            provider: values.provider,
            model: values.model,
            baseUrl: values.baseUrl,
            apiKey: values.apiKey,
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
    const chefs = getAIModelChefs()

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>
                        {isEditing ? "Edit LLM" : "Add LLM"}
                    </DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Name *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., GPT-4 Production" {...field} />
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

                        {/* Model Selector - auto-populates provider */}
                        <FormItem>
                            <FormLabel>Model *</FormLabel>
                            <ModelSelector open={modelSelectorOpen} onOpenChange={setModelSelectorOpen}>
                                <ModelSelectorTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full justify-between"
                                    >
                                        {selectedModelData ? (
                                            <span className="flex items-center gap-2">
                                                <ModelSelectorLogo provider={selectedModelData.chefSlug} />
                                                <ModelSelectorName>{selectedModelData.name}</ModelSelectorName>
                                                <span className="text-muted-foreground text-xs">
                                                    ({selectedModelData.chef})
                                                </span>
                                            </span>
                                        ) : (
                                            <span className="text-muted-foreground">Select a model...</span>
                                        )}
                                        <ChevronsUpDownIcon className="size-4 opacity-50" />
                                    </Button>
                                </ModelSelectorTrigger>
                                <ModelSelectorContent>
                                    <ModelSelectorInput placeholder="Search models..." />
                                    <ModelSelectorList>
                                        <ModelSelectorEmpty>No models found.</ModelSelectorEmpty>
                                        {chefs.map((chef) => (
                                            <ModelSelectorGroup heading={chef} key={chef}>
                                                {getAIModelsByChef(chef).map((model) => (
                                                    <ModelSelectorItem
                                                        key={model.id}
                                                        value={model.id}
                                                        onSelect={() => handleModelSelect(model.id)}
                                                    >
                                                        <ModelSelectorLogo provider={model.chefSlug} />
                                                        <ModelSelectorName>{model.name}</ModelSelectorName>
                                                        {selectedModel === model.id ? (
                                                            <CheckIcon className="ml-auto size-4" />
                                                        ) : (
                                                            <div className="ml-auto size-4" />
                                                        )}
                                                    </ModelSelectorItem>
                                                ))}
                                            </ModelSelectorGroup>
                                        ))}
                                    </ModelSelectorList>
                                </ModelSelectorContent>
                            </ModelSelector>
                            {form.formState.errors.model && (
                                <p className="text-destructive text-sm">{form.formState.errors.model.message}</p>
                            )}
                        </FormItem>

                        <FormField
                            control={form.control}
                            name="baseUrl"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Base URL *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="https://api.openai.com/v1" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="apiKey"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>API Key *</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="password"
                                            placeholder="sk-..."
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
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
