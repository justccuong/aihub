import { createParser } from "nuqs/server"
import { PAGINATION } from "@/config/constants"
import { z } from "zod"

// Single source of truth: Zod schema for query parameters
export const datasourcesQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(PAGINATION.DEFAULT_PAGE),
    pageSize: z.coerce.number().int().positive().max(100).default(PAGINATION.DEFAULT_PAGE_SIZE),
    search: z.string().default(""),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

// Derive nuqs parsers from the Zod schema
export const datasourcesParams = {
    page: createParser({
        parse: (value) => datasourcesQuerySchema.shape.page.parse(value),
        serialize: (value) => String(value),
    }).withDefault(PAGINATION.DEFAULT_PAGE).withOptions({ clearOnDefault: true }),

    pageSize: createParser({
        parse: (value) => datasourcesQuerySchema.shape.pageSize.parse(value),
        serialize: (value) => String(value),
    }).withDefault(PAGINATION.DEFAULT_PAGE_SIZE).withOptions({ clearOnDefault: true }),

    search: createParser({
        parse: (value) => datasourcesQuerySchema.shape.search.parse(value),
        serialize: (value) => value,
    }).withDefault("").withOptions({ clearOnDefault: true }),

    sortOrder: createParser({
        parse: (value) => datasourcesQuerySchema.shape.sortOrder.parse(value),
        serialize: (value) => value,
    }).withDefault('desc' as const).withOptions({ clearOnDefault: true }),
}

export const idParamSchema = z.object({
    id: z.coerce.number().int().positive(),
})
/** Raw URL params - id is string from the URL */
export type DatasourceParams = { id: string }
/** Parsed params after Zod coercion */
export type ParsedDatasourceParams = z.infer<typeof idParamSchema>

export const groupIdParamSchema = z.object({
    groupId: z.coerce.number().int().positive(),
})
export type GroupIdParams = z.infer<typeof groupIdParamSchema>