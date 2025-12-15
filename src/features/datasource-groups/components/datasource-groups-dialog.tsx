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
import { useCreateDatasourceGroup, useUpdateDatasourceGroup } from "../hooks/use-datasource-groups"
import { useEffect } from "react"
import { honoClient } from "@/lib/api/hono-client"
import { InferResponseType } from "hono/client"
import { createDatasourceGroupSchema } from "../server/routers"

type DatasourceGroupFormValues = z.input<typeof createDatasourceGroupSchema>
type DatasourceGroupsSuccessResponse = InferResponseType<typeof honoClient.api['datasource-groups']['$get'], 200>
type DatasourceGroupItem = DatasourceGroupsSuccessResponse["data"][number]

interface DatasourceGroupsDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    editItem?: DatasourceGroupItem | null
}

export const DatasourceGroupsDialog = ({
    open,
    onOpenChange,
    editItem,
}: DatasourceGroupsDialogProps) => {
    const createMutation = useCreateDatasourceGroup()
    const updateMutation = useUpdateDatasourceGroup()
    const isEditing = !!editItem

    const form = useForm<DatasourceGroupFormValues>({
        resolver: zodResolver(createDatasourceGroupSchema),
        defaultValues: {
            name: "",
            description: "",
        },
    })

    useEffect(() => {
        if (editItem) {
            form.reset({
                name: editItem.name,
                description: editItem.description || "",
            })
        } else {
            form.reset({
                name: "",
                description: "",
            })
        }
    }, [editItem, form])

    const onSubmit = async (values: DatasourceGroupFormValues) => {
        const payload = {
            name: values.name,
            description: values.description || undefined,
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
                        {isEditing ? "Edit Datasource Group" : "Add Datasource Group"}
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
                                        <Input placeholder="e.g., Documentation" {...field} />
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
                                            rows={3}
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
