import { createOpenAI } from "@ai-sdk/openai"
import { convertToModelMessages, generateText, stepCountIs, streamText, tool, UIMessage } from "ai"
import z from "zod"
import { searchVectors } from "@/lib/vectorize"
import { AgentDetail } from "@/features/agents/server/service"
import { chatLogger as logger } from "@/lib/logger"

type AgentDetailResolved = NonNullable<AgentDetail>

export function normalizeTemperature(temp: number): number {
    return Math.max(0, Math.min(1, temp / 100))
}

// Create AI Provider based on provider data
export const createAIProvider = ({ llm }: AgentDetailResolved) => {
    logger.info('Creating AI provider', { provider: llm.provider, model: llm.model })
    switch (llm.provider) {
        case "openai":
            return createOpenAI({
                baseURL: llm.baseUrl,
                apiKey: llm.apiKey,
            });
        default:
            logger.warn('Unknown provider, defaulting to OpenAI', { provider: llm.provider })
            return createOpenAI({
                baseURL: llm.baseUrl,
                apiKey: llm.apiKey,
            });
    }
}

export const createSemanticSearchTool = (
    agent: AgentDetailResolved
) =>
    tool({
        description: "Tìm thông tin theo ngữ cảnh, luôn sử dụng tool này khi người dùng hỏi về một vấn đề, trường hợp không có kết quả, hãy trả lời không biết",
        inputSchema: z.object({
            query: z
                .string()
                .describe(
                    "Thông tin cần tìm kiếm"
                ),
            reasoning: z
                .string()
                .describe(
                    "Giải thích tại sao bạn chọn tìm kiếm thông tin"
                ),
        }),
        execute: async ({
            query,
            reasoning,
        }: {
            query: string
            reasoning: string
        }) => {
            try {
                logger.info('Semantic search tool executing', { query, reasoning, agentId: agent.id })
                logger.debug('Semantic search datasource groups', { groups: agent.datasourceGroups })

                // Use vectorize search
                const vectorResults = await searchVectors(query, agent.datasourceGroups.map(g => g.id), agent.topK ?? 40)

                logger.info('Semantic search completed', { query, resultCount: vectorResults.length })
                if (vectorResults.length === 0) {
                    return {
                        success: true,
                        data: [],
                        count: 0,
                        reasoning,
                        message: "Không tìm thấy thông tin",
                    }
                }

                return vectorResults
            } catch (error) {
                logger.error('Semantic search tool error', { query, error: String(error) })
                return {
                    success: false,
                    error: `Semantic search failed: ${error}`,
                    reasoning,
                }
            }
        },
    })

function createAgentTools(agent: AgentDetailResolved) {
    logger.debug('Creating agent tools', { agentId: agent.id })
    return {
        semanticSearchTool: createSemanticSearchTool(agent),
    }
}

async function prepareAIConfig(
    {
        agent,
    }: {
        agent: AgentDetailResolved
    }
) {
    logger.info('Preparing AI config', { agentId: agent.id, model: agent.llm.model })
    // Create tools
    const tools = createAgentTools(agent)

    // Create AI provider
    const aiProvider = createAIProvider(agent)

    return {
        tools,
        aiProvider,
    }
}

// Stream Agentic RAG response with tool calling
export async function streamAIResponse(
    {
        agent,
        messages: inputMessages = []
    }: {
        agent: AgentDetailResolved
        messages: UIMessage[]
    }
) {
    logger.info('Starting AI stream response', {
        agentId: agent.id,
        model: agent.llm.model,
        messageCount: inputMessages.length
    })
    try {
        // Prepare AI configuration using shared function
        const { tools, aiProvider } = await prepareAIConfig({
            agent,
        })

        // Build messages array
        const messages = [
            { role: "system" as const, content: agent.systemPrompt ?? "" },
            ...convertToModelMessages(inputMessages),
        ]

        // Use AI SDK streaming with provider and tools
        const result = streamText({
            model: aiProvider.chat(agent.llm.model),
            messages,
            tools,
            toolChoice: "auto",
            temperature: normalizeTemperature(agent.temperature ?? 70),
            maxOutputTokens: agent.maxTokens ?? 1024,
            stopWhen: stepCountIs(5),
        })

        logger.info('AI stream started successfully', { agentId: agent.id })
        return result
    } catch (error) {
        logger.error('AI streaming error', { agentId: agent.id, error: String(error) })
        throw new Error(`AI streaming failed: ${error}`)
    }
}

// Non-stream Agentic RAG response with tool calling
export async function generateAIResponse(
    {
        agent,
        messages: inputMessages = [],
    }: {
        agent: AgentDetailResolved
        messages: UIMessage[]
    }
) {
    logger.info('Starting AI generate response', {
        agentId: agent.id,
        model: agent.llm.model,
        messageCount: inputMessages.length
    })
    try {
        // Prepare AI configuration using shared function
        const { tools, aiProvider } = await prepareAIConfig({
            agent,
        })

        // Build messages array
        const messages = [
            { role: "system" as const, content: agent.systemPrompt ?? "" },
            ...convertToModelMessages(inputMessages),
        ]

        // Use AI SDK streaming with provider and tools
        const result = await generateText({
            model: aiProvider.chat(agent.llm.model),
            messages,
            tools,
            toolChoice: "auto",
            temperature: normalizeTemperature(agent.temperature ?? 70),
            maxOutputTokens: agent.maxTokens ?? 1024,
            stopWhen: stepCountIs(5),
        })

        logger.info('AI generate completed successfully', { agentId: agent.id })
        return result
    } catch (error) {
        logger.error('AI generate error', { agentId: agent.id, error: String(error) })
        throw new Error(`AI streaming failed: ${error}`)
    }
}