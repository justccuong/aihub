import { protectedRoute } from "@/backend/middleware/auth";
import { Hono } from "hono";
import { uiMessageSchema } from "./ui-message.schema";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { generateAIResponse, streamAIResponse } from "./service";
import { getLlmById } from "@/features/llms/server/service";
import { getAgentById } from "@/features/agents/server/service";
import { agentParams } from "../params";

export const chatRequestSchema = z.object({
    stream: z.boolean().default(false),
    messages: uiMessageSchema.array(),
})

export const playgroundRequestSchema = chatRequestSchema.extend({
    customConfig: z
        .object({
            llmId: z.number().optional(),
            systemPrompt: z.string().optional(),
            knowledgeSourceGroupId: z.number().optional(),
            topK: z.number().min(1).max(50).optional(),
            temperature: z.number().min(0).max(100).optional(),
            maxTokens: z.number().min(1).max(4000).optional(),
        })
        .optional(),
})

export const chatRouter = new Hono()
    .post('/playground/:agentId', protectedRoute, zValidator('json', playgroundRequestSchema), zValidator('param', agentParams), async (c) => {

        const { agentId } = c.req.valid("param")
        const { messages, customConfig, stream } = c.req.valid("json")

        // Get agent with LLM data
        let agentDetail = await getAgentById(agentId)
        if (!agentDetail) {
            return c.json({ error: 'Agent not found or has no LLM configured' }, 404)
        }

        if (customConfig) {
            // Handle custom LLM override
            if (customConfig.llmId && customConfig.llmId !== agentDetail.llm.id) {
                const customLlm = await getLlmById(customConfig.llmId)
                if (!customLlm) {
                    return c.json({ error: 'Custom LLM not found' }, 404)
                }
                agentDetail.llm = customLlm
            }

            // Apply other overrides
            agentDetail = {
                ...agentDetail,
                systemPrompt: customConfig.systemPrompt ?? agentDetail.systemPrompt,
                topK: customConfig.topK ?? agentDetail.topK,
                temperature: customConfig.temperature ?? agentDetail.temperature,
                maxTokens: customConfig.maxTokens ?? agentDetail.maxTokens,
            }
        }

        try {
            if (stream) {
                const result = await streamAIResponse({
                    agent: agentDetail,
                    messages,
                })

                // Return streaming response
                return result.toUIMessageStreamResponse()
            } else {
                const result = await generateAIResponse({
                    agent: agentDetail,
                    messages,
                })

                // Return non-streaming response
                return c.json({ data: result })
            }
        } catch (error) {
            console.error('Chat streaming error:', error)
            return c.json({ error: 'Failed to stream AI response' }, 500)
        }
    })
    .post("/completions/:agentId", zValidator('json', chatRequestSchema), zValidator('param', agentParams), async (c) => {
        const { agentId } = c.req.valid("param")
        const { messages, stream } = c.req.valid("json")

        const agentDetail = await getAgentById(agentId)
        if (!agentDetail) {
            return c.json({ error: 'Agent not found or has no LLM configured' }, 404)
        }

        try {
            if (stream) {
                const result = await streamAIResponse({
                    agent: agentDetail,
                    messages,
                })

                // Return streaming response
                return result.toUIMessageStreamResponse()
            } else {
                const result = await generateAIResponse({
                    agent: agentDetail,
                    messages,
                })

                // Return non-streaming response
                return c.json({ data: result })
            }
        } catch (error) {
            console.error('Chat streaming error:', error)
            return c.json({ error: 'Failed to stream AI response' }, 500)
        }
    })