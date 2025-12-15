import { createParser } from "nuqs/server"
import { PAGINATION } from "@/config/constants"
import { z } from "zod"

// Single source of truth: Zod schema for query parameters
export const agentsQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(PAGINATION.DEFAULT_PAGE),
    pageSize: z.coerce.number().int().positive().max(100).default(PAGINATION.DEFAULT_PAGE_SIZE),
    search: z.string().default(""),
    sortBy: z.enum(['name', 'createdAt', 'updatedAt']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

// Derive nuqs parsers from the Zod schema
export const agentsParams = {
    page: createParser({
        parse: (value) => agentsQuerySchema.shape.page.parse(value),
        serialize: (value) => String(value),
    }).withDefault(PAGINATION.DEFAULT_PAGE).withOptions({ clearOnDefault: true }),

    pageSize: createParser({
        parse: (value) => agentsQuerySchema.shape.pageSize.parse(value),
        serialize: (value) => String(value),
    }).withDefault(PAGINATION.DEFAULT_PAGE_SIZE).withOptions({ clearOnDefault: true }),

    search: createParser({
        parse: (value) => agentsQuerySchema.shape.search.parse(value),
        serialize: (value) => value,
    }).withDefault("").withOptions({ clearOnDefault: true }),

    sortBy: createParser({
        parse: (value) => agentsQuerySchema.shape.sortBy.parse(value),
        serialize: (value) => value,
    }).withDefault('createdAt' as const).withOptions({ clearOnDefault: true }),

    sortOrder: createParser({
        parse: (value) => agentsQuerySchema.shape.sortOrder.parse(value),
        serialize: (value) => value,
    }).withDefault('desc' as const).withOptions({ clearOnDefault: true }),
}
