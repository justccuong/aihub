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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useCreateLlm, useUpdateLlm } from "../hooks/use-llms"
import { useEffect } from "react"
import { honoClient } from "@/lib/api/hono-client"
import { InferResponseType } from "hono/client"
import { createLlmSchema } from "../server/routers"

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

    const form = useForm<LlmFormValues>({
        resolver: zodResolver(createLlmSchema),
        defaultValues: {
            name: "",
            description: "",
            provider: "",
            model: "",
            baseUrl: "",
            apiKey: "",
        },
    })

    useEffect(() => {
        if (editItem) {
            form.reset({
                name: editItem.name,
                description: editItem.description || "",
                provider: editItem.provider,
                model: editItem.model,
                baseUrl: editItem.baseUrl,
                apiKey: editItem.apiKey,
            })
        } else {
            form.reset({
                name: "",
                description: "",
                provider: "",
                model: "",
                baseUrl: "",
                apiKey: "",
            })
        }
    }, [editItem, form])

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
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="provider"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Provider *</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder="Select provider" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="openai">OpenAI</SelectItem>
                                                <SelectItem value="google">Google</SelectItem>
                                                <SelectItem value="anthropic">Anthropic</SelectItem>
                                                <SelectItem value="ollama">Ollama</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="model"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Model *</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g., gpt-4-turbo" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
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
