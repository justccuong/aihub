import {
    BotIcon,
    MoreVerticalIcon,
    PlusIcon,
    SearchIcon,
    TrashIcon,
} from "lucide-react"
import { Button } from "./ui/button"
import Link from "next/link"
import { Input } from "./ui/input"
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "./ui/empty"
import { Spinner } from "./ui/spinner"
import { cn } from "@/lib/utils"
import React, { useState } from "react"
import { Card, CardContent, CardDescription, CardTitle } from "./ui/card"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "./ui/dropdown-menu"
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    useReactTable,
    getPaginationRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    SortingState,
    ColumnFiltersState,
    VisibilityState,
    RowSelectionState,
    Table as TableType,
} from "@tanstack/react-table"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "./ui/table"
import { ChevronDownIcon, ChevronsUpDownIcon, ChevronUpIcon, EditIcon } from "lucide-react"
import { ConfirmDialog } from "./ui/confirm-dialog"

export interface EntityTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[]
    data: TData[]
    emptyMessage?: string
    emptyView?: React.ReactNode
    className?: string
    // Optional features
    enableSorting?: boolean
    enableFiltering?: boolean
    enablePagination?: boolean
    enableRowSelection?: boolean
    pageSize?: number
    // Callbacks
    onRowClick?: (row: TData) => void
    // Loading state
    isPending?: boolean
}

type EntityHeaderProps = {
    title: string
    description?: string
    newButtonLabel?: string
    disabled?: boolean
    isCreating?: boolean
} & (
        | {
            onNew: () => void
            newButtonHref?: never
        }
        | {
            newButtonHref: string
            onNew?: never
        }
        | {
            onNew?: never
            newButtonHref?: never
        }
    )

export const EntityHeader = ({
    title,
    description,
    onNew,
    newButtonHref,
    newButtonLabel = "New",
    disabled,
    isCreating,
}: EntityHeaderProps) => {
    return (
        <div className="flex flex-row items-center justify-between gap-x-4">
            <div className="flex flex-col">
                <h1 className="text-lg md:text-xl font-semibold">{title}</h1>
                {description && (
                    <p className="text-xs md:text-sm text-muted-foreground">
                        {description}
                    </p>
                )}
            </div>
            {onNew && !newButtonHref && (
                <Button
                    disabled={isCreating || disabled}
                    size="sm"
                    onClick={onNew}
                >
                    <PlusIcon className="size-4" />
                    {newButtonLabel}
                </Button>
            )}
            {newButtonHref && !onNew && (
                <Button size="sm" asChild>
                    <Link href={newButtonHref} prefetch>
                        <PlusIcon className="size-4" />
                        {newButtonLabel}
                    </Link>
                </Button>
            )}
        </div>
    )
}

type EntityContainerProps = {
    header?: React.ReactNode
    search?: React.ReactNode
    pagination?: React.ReactNode
    children: React.ReactNode
}

export const EntityContainer = ({
    header,
    search,
    pagination,
    children,
}: EntityContainerProps) => {
    return (
        <div className="p-4 md:px-10 md:py-6 h-full">
            <div className="mx-auto max-w-screen w-full flex flex-col gap-y-8 h-full">
                {header}
                <div className="flex flex-col gap-y-4 h-full">
                    {search}
                    {children}
                    {pagination}
                </div>
            </div>
        </div>
    )
}

interface EntitySearchProps {
    value: string
    onChange: (value: string) => void
    placeholder?: string
}

export const EntitySearch = ({
    value,
    onChange,
    placeholder = "Search...",
}: EntitySearchProps) => {
    return (
        <div className="relative ml-auto">
            <SearchIcon className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
                className="min-w-[400px] bg-background shadow-none border-border pl-8"
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
        </div>
    )
}

interface EntityPaginationProps {
    page: number
    totalPages: number
    onPageChange: (page: number) => void
    disabled?: boolean
}

export const EntityPagination = ({
    page,
    totalPages,
    onPageChange,
    disabled,
}: EntityPaginationProps) => {
    return (
        <div className="flex items-center justify-between gap-x-2 w-full">
            <div className="flex-1 text-sm text-muted-foreground">
                Page {page} of {totalPages || 1}
            </div>
            <div className="flex items-center justify-end gap-x-2 py-4">
                <Button
                    disabled={disabled || page <= 1}
                    variant={"outline"}
                    size={"sm"}
                    onClick={() => onPageChange(Math.max(1, page - 1))}
                >
                    Previous
                </Button>
                <Button
                    disabled={
                        disabled || page >= totalPages || totalPages === 0
                    }
                    variant={"outline"}
                    size={"sm"}
                    onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                >
                    Next
                </Button>
            </div>
        </div>
    )
}

interface EntityStateViewProps {
    icon?: React.ReactNode
    title?: string
    message?: string
    content?: React.ReactNode
}

export const EntityStateView = ({
    icon,
    title = "Loading",
    message,
    content,
}: EntityStateViewProps) => {
    return (
        <Empty className="border border-dashed bg-white dark:bg-background">
            <EmptyHeader>
                <EmptyMedia variant="icon">
                    {icon ? icon : <BotIcon />}
                </EmptyMedia>
                <EmptyTitle>{title}</EmptyTitle>
                {!!message && <EmptyDescription>{message}</EmptyDescription>}
            </EmptyHeader>
            {!!content && <EmptyContent>{content}</EmptyContent>}
        </Empty>
    )
}

interface EntityEmptyViewProps extends EntityStateViewProps {
    onNews?: () => void
    newLabel?: string
    isLoading?: boolean
}

export const EntityEmptyView = ({
    onNews,
    newLabel = "New Item",
    isLoading,
    ...props
}: EntityEmptyViewProps) => {
    return (
        <EntityStateView
            {...props}
            content={
                onNews && (
                    <Button onClick={onNews} size="sm" disabled={isLoading}>
                        <PlusIcon className="size-4" />
                        {newLabel}
                    </Button>
                )
            }
        />
    )
}

interface EntityListProps<T> {
    items: T[]
    renderItem: (item: T, index: number) => React.ReactNode
    getKey?: (item: T, index: number) => string | number
    emptyView?: React.ReactNode
    className?: string
    isPending?: boolean
}

export function EntityList<T>({
    items,
    renderItem,
    getKey,
    emptyView,
    className,
    isPending,
}: EntityListProps<T>) {
    if (items.length === 0 && emptyView) {
        return (
            <div className="flex-1 flex justify-center items-center">
                <div className="max-w-sm mx-auto">{emptyView}</div>
            </div>
        )
    }

    return (
        <div className={cn("relative flex flex-col gap-y-4", className)}>
            {isPending && (
                <div className="absolute inset-0 bg-background/60 backdrop-blur-sm z-10 flex items-center justify-center rounded-md">
                    <Spinner className="size-6" />
                </div>
            )}
            {items.map((item, index) => (
                <div key={getKey ? getKey(item, index) : index}>
                    {renderItem(item, index)}
                </div>
            ))}
        </div>
    )
}

interface EntityItemProps {
    href: string
    title: string
    subtitle?: React.ReactNode
    image?: React.ReactNode
    actions?: React.ReactNode
    onEdit?: () => void
    onRemove?: () => void | Promise<void>
    isRemoving?: boolean
    className?: string
    onClick?: (e: React.MouseEvent) => void
}

export const EntityItem = ({
    href,
    title,
    subtitle,
    image,
    actions,
    onEdit,
    onRemove,
    isRemoving,
    className,
    onClick,
}: EntityItemProps) => {
    const [openMenu, setOpenMenu] = useState(false)
    const handleRemove = async (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()

        if (isRemoving) return

        if (onRemove) {
            await onRemove()
            setOpenMenu(false)
        }
    }

    const handleEdit = (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (onEdit) {
            onEdit()
            setOpenMenu(false)
        }
    }

    return (
        <Link href={href} prefetch onClick={onClick}>
            <Card
                className={cn(
                    "p-4 shadow-none hover:shadow cursor-pointer",
                    isRemoving && "opacity-50 cursor-not-allowed",
                    className
                )}
            >
                <CardContent className="flex flex-row items-center justify-between p-0">
                    <div className="flex items-center gap-3">
                        {image}
                        <div>
                            <CardTitle className="text-base font-medium">
                                {title}
                            </CardTitle>
                            {!!subtitle && (
                                <CardDescription className="text-xs">
                                    {subtitle}
                                </CardDescription>
                            )}
                        </div>
                    </div>
                    {(actions || onEdit || onRemove) && (
                        <div className="flex gap-x-4 items-center">
                            {actions}
                            {(onEdit || onRemove) && (
                                <DropdownMenu
                                    open={openMenu}
                                    onOpenChange={setOpenMenu}
                                >
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={(e) => e.stopPropagation()}
                                            disabled={isRemoving}
                                        >
                                            <MoreVerticalIcon className="size-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                        align="end"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {onEdit && (
                                            <DropdownMenuItem onClick={handleEdit}>
                                                <EditIcon className="size-4" />
                                                Edit
                                            </DropdownMenuItem>
                                        )}
                                        {onRemove && (
                                            <DropdownMenuItem
                                                onClick={handleRemove}
                                                disabled={isRemoving}
                                                className="text-destructive focus:text-destructive"
                                            >
                                                <TrashIcon className="size-4" />
                                                Delete
                                            </DropdownMenuItem>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </Link>
    )
}

// ==========================================
// Table Components (using TanStack Table)
// ==========================================


export function EntityTable<TData, TValue>({
    columns,
    data,
    emptyMessage = "No results.",
    emptyView,
    className,
    enableSorting = false,
    enableFiltering = false,
    enablePagination = false,
    enableRowSelection = false,
    pageSize = 10,
    onRowClick,
    isPending,
}: EntityTableProps<TData, TValue>) {
    const [sorting, setSorting] = useState<SortingState>([])
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        ...(enablePagination && {
            getPaginationRowModel: getPaginationRowModel(),
            initialState: { pagination: { pageSize } },
        }),
        ...(enableSorting && {
            getSortedRowModel: getSortedRowModel(),
            onSortingChange: setSorting,
        }),
        ...(enableFiltering && {
            getFilteredRowModel: getFilteredRowModel(),
            onColumnFiltersChange: setColumnFilters,
        }),
        ...(enableRowSelection && {
            onRowSelectionChange: setRowSelection,
        }),
        onColumnVisibilityChange: setColumnVisibility,
        state: {
            ...(enableSorting && { sorting }),
            ...(enableFiltering && { columnFilters }),
            ...(enableRowSelection && { rowSelection }),
            columnVisibility,
        },
    })

    if (data.length === 0 && emptyView) {
        return (
            <div className="flex-1 flex justify-center items-center">
                <div className="max-w-sm mx-auto">{emptyView}</div>
            </div>
        )
    }

    return (
        <div className={cn("relative space-y-4", className)}>
            {isPending && (
                <div className="absolute inset-0 bg-background/60 backdrop-blur-sm z-10 flex items-center justify-center rounded-md">
                    <Spinner className="size-6" />
                </div>
            )}
            <div className="overflow-hidden rounded-md border bg-background">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <TableHead key={header.id}>
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(
                                                header.column.columnDef.header,
                                                header.getContext()
                                            )}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && "selected"}
                                    className={cn(
                                        onRowClick && "cursor-pointer"
                                    )}
                                    onClick={() => onRowClick?.(row.original)}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext()
                                            )}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell
                                    colSpan={columns.length}
                                    className="h-24 text-center"
                                >
                                    {emptyMessage}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            {enablePagination && (
                <EntityTablePagination table={table} />
            )}
        </div>
    )
}

interface EntityTablePaginationProps<TData> {
    table: TableType<TData>
}

export function EntityTablePagination<TData>({
    table,
}: EntityTablePaginationProps<TData>) {
    return (
        <div className="flex items-center justify-between gap-x-2 w-full">
            <div className="flex-1 text-sm text-muted-foreground">
                Page {table.getState().pagination.pageIndex + 1} of{" "}
                {table.getPageCount() || 1}
            </div>
            <div className="flex items-center justify-end gap-x-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                >
                    Previous
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                >
                    Next
                </Button>
            </div>
        </div>
    )
}

interface EntityTableRowActionsProps {
    onEdit?: () => void
    onRemove?: () => void | Promise<void>
    isRemoving?: boolean
    editLabel?: string
    deleteLabel?: string
    confirmTitle?: string
    confirmDescription?: string
}

export const EntityTableRowActions = ({
    onEdit,
    onRemove,
    isRemoving,
    editLabel = "Edit",
    deleteLabel = "Delete",
    confirmTitle = "Delete this item?",
    confirmDescription = "This action cannot be undone. This will permanently delete this item.",
}: EntityTableRowActionsProps) => {
    const [openMenu, setOpenMenu] = useState(false)
    const [confirmOpen, setConfirmOpen] = useState(false)

    const handleRemove = async () => {
        if (isRemoving) return

        if (onRemove) {
            await onRemove()
            setConfirmOpen(false)
            setOpenMenu(false)
        }
    }

    return (
        <>
            <DropdownMenu open={openMenu} onOpenChange={setOpenMenu}>
                <DropdownMenuTrigger asChild>
                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => e.stopPropagation()}
                        disabled={isRemoving}
                    >
                        <MoreVerticalIcon className="size-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                    {onEdit && (
                        <DropdownMenuItem onClick={onEdit}>
                            <EditIcon className="size-4" />
                            {editLabel}
                        </DropdownMenuItem>
                    )}
                    {onRemove && (
                        <DropdownMenuItem
                            onClick={(e) => {
                                e.preventDefault()
                                setConfirmOpen(true)
                                setOpenMenu(false)
                            }}
                            disabled={isRemoving}
                            className="text-destructive focus:text-destructive"
                        >
                            <TrashIcon className="size-4" />
                            {deleteLabel}
                        </DropdownMenuItem>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
            <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title={confirmTitle}
                description={confirmDescription}
                confirmLabel="Delete"
                onConfirm={handleRemove}
                isLoading={isRemoving}
            />
        </>
    )
}

interface EntityTableColumnHeaderProps<TData, TValue> {
    column: import("@tanstack/react-table").Column<TData, TValue>
    title: string
    className?: string
}

export function EntityTableColumnHeader<TData, TValue>({
    column,
    title,
    className,
}: EntityTableColumnHeaderProps<TData, TValue>) {
    if (!column.getCanSort()) {
        return <div className={cn(className)}>{title}</div>
    }

    return (
        <Button
            variant="ghost"
            size="sm"
            className={cn("-ml-3 h-8", className)}
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
            {title}
            {column.getIsSorted() === "desc" ? (
                <ChevronDownIcon className="ml-2 size-4" />
            ) : column.getIsSorted() === "asc" ? (
                <ChevronUpIcon className="ml-2 size-4" />
            ) : (
                <ChevronsUpDownIcon className="ml-2 size-4" />
            )}
        </Button>
    )
}