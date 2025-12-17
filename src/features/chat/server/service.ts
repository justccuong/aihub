import { createOpenAI } from "@ai-sdk/openai"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { convertToModelMessages, generateText, stepCountIs, streamText, UIMessage } from "ai"
import { AgentDetail } from "@/features/agents/server/service"
import { chatLogger as logger } from "@/lib/logger"
import { createAgentTools } from "./tools"

// Re-export tool types for external use
export {
    semanticSearchInputSchema,
    type SemanticSearchToolInput,
    type SemanticSearchToolUI,
    webSearchInputSchema,
    type WebSearchToolInput,
    type WebSearchToolUI,
    type PlaygroundToolSet,
    type PlaygroundUITools,
    type PlaygroundUIMessage,
} from "./tools"

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
        case "google":
            return createGoogleGenerativeAI({
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

const createMessages = ({
    agent,
    messages
}: {
    agent: AgentDetailResolved
    messages: UIMessage[]
}) => {
    const systemPrompt = `${agent.systemPrompt}

Bạn có 2 công cụ:
1. semanticSearchTool: Tìm kiếm thông tin trong cơ sở dữ liệu nội bộ. Luôn sử dụng tool này trước khi trả lời câu hỏi.
2. webSearchTool: Tìm kiếm thông tin trên internet khi cần thông tin mới nhất hoặc thông tin không có trong cơ sở dữ liệu nội bộ.

Nếu không tìm thấy kết quả từ cả 2 công cụ, hãy trả lời không biết, không được bịa kết quả.
    `
    return [
        { role: "system" as const, content: systemPrompt },
        ...convertToModelMessages(messages),
    ]
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
        const messages = createMessages({
            agent,
            messages: inputMessages,
        })

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