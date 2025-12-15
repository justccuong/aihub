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
import { Textarea } from "@/components/ui/textarea"
import { useCreateDatasource, useUpdateDatasource } from "../hooks/use-datasources"
import { useEffect } from "react"
import { honoClient } from "@/lib/api/hono-client"
import { InferResponseType } from "hono/client"
import { useParams } from "next/navigation"

// Form schema - content only for the form
const formSchema = z.object({
    content: z.string().min(1, 'Content is required'),
})

type DatasourceFormValues = z.infer<typeof formSchema>
type DatasourcesSuccessResponse = InferResponseType<typeof honoClient.api.datasources.group[':groupId']['$get'], 200>
type DatasourceItem = DatasourcesSuccessResponse["data"][number]

interface DatasourcesDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    editItem?: DatasourceItem | null
}

export const DatasourcesDialog = ({
    open,
    onOpenChange,
    editItem,
}: DatasourcesDialogProps) => {
    const params = useParams<{ id: string }>()
    const groupId = parseInt(params.id, 10)

    const createMutation = useCreateDatasource()
    const updateMutation = useUpdateDatasource()
    const isEditing = !!editItem

    const form = useForm<DatasourceFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            content: "",
        },
    })

    useEffect(() => {
        if (editItem) {
            form.reset({
                content: editItem.content,
            })
        } else {
            form.reset({
                content: "",
            })
        }
    }, [editItem, form])

    const onSubmit = async (values: DatasourceFormValues) => {
        if (isEditing && editItem) {
            updateMutation.mutate(
                { id: editItem.id, data: { content: values.content } },
                {
                    onSuccess: () => {
                        form.reset()
                        onOpenChange(false)
                    },
                }
            )
        } else {
            createMutation.mutate(
                { content: values.content, datasourceGroupId: groupId },
                {
                    onSuccess: () => {
                        form.reset()
                        onOpenChange(false)
                    },
                }
            )
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
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>
                        {isEditing ? "Edit Datasource" : "Add Datasource"}
                    </DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="content"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Content *</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Enter the content for this datasource..."
                                            rows={10}
                                            className="text-sm"
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
