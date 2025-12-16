import { createOpenAI } from "@ai-sdk/openai"
import { createAnthropic } from "@ai-sdk/anthropic"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { createOllama } from "ollama-ai-provider-v2"
import { convertToModelMessages, generateText, stepCountIs, streamText, tool, UIMessage } from "ai"
import z from "zod"
import { searchVectors } from "@/lib/vectorize"
import { AgentDetail } from "@/features/agents/server/service"

type AgentDetailResolved = NonNullable<AgentDetail>

export function normalizeTemperature(temp: number): number {
    return Math.max(0, Math.min(1, temp / 100))
}

// Create AI Provider based on provider data
export const createAIProvider = ({ llm }: AgentDetailResolved) => {
    switch (llm.provider) {
        case "openai":
            return createOpenAI({
                baseURL: llm.baseUrl,
                apiKey: llm.apiKey,
            });
        case "anthropic":
            return createAnthropic({
                baseURL: llm.baseUrl,
                apiKey: llm.apiKey,
            });
        case "google":
            return createGoogleGenerativeAI({
                baseURL: llm.baseUrl,
                apiKey: llm.apiKey,
            });
        case "ollama":
            return createOllama({
                baseURL: llm.baseUrl,
                headers: {
                    "Authorization": `Bearer ${llm.apiKey}`,
                }
            });
        default:
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
        description: "Tìm thông tin về câu lạc bộ",
        inputSchema: z.object({
            query: z
                .string()
                .describe(
                    "Tìm thông tin về câu lạc bộ"
                ),
            reasoning: z
                .string()
                .describe(
                    "Giải thích tại sao bạn chọn tìm kiếm thông tin về câu lạc bộ"
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
                console.log(`🔍 Semantic Search Tool - Reasoning: ${reasoning}`)
                console.log(`🔍 Semantic Search Tool - Query: ${query}`)

                // Use vectorize search
                const vectorResults = await searchVectors(query, agent.datasourceGroups.map(g => g.id), agent.topK ?? 40)

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
                console.error("Semantic Search Tool Error:", error)
                return {
                    success: false,
                    error: `Semantic search failed: ${error}`,
                    reasoning,
                }
            }
        },
    })

function createAgentTools(agent: AgentDetailResolved) {
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

        return result
    } catch (error) {
        console.error("AI Streaming Error:", error)
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

        return result
    } catch (error) {
        console.error("AI Streaming Error:", error)
        throw new Error(`AI streaming failed: ${error}`)
    }
}