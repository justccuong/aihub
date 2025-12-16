import z from "zod";

export const agentParams = z.object({
    agentId: z.coerce.number().int().positive(),
})
export type AgentParams = z.infer<typeof agentParams>
