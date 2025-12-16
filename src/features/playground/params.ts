import { createParser, parseAsInteger } from "nuqs/server"
import { z } from "zod"

// Single source of truth: Zod schema for playground query parameters
export const playgroundQuerySchema = z.object({
    agentId: z.coerce.number().int().positive().optional(),
})

// Derive nuqs parsers from the Zod schema
export const playgroundParams = {
    agentId: parseAsInteger.withOptions({ clearOnDefault: true }),
}

