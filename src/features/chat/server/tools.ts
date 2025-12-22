import { tool, InferUITools, UIMessage } from "ai"
import z from "zod"
import ky, { HTTPError } from "ky"
import { searchVectors } from "@/lib/vectorize"
import { AgentDetail } from "@/features/agents/server/service"
import { chatLogger as logger } from "@/lib/logger"
import { getDb } from "@/lib/db"
import { ollamaKeys } from "@/lib/schema"
import { getKV, putKV } from "@/lib/kv"

type AgentDetailResolved = NonNullable<AgentDetail>

// ============================================
// Ollama Web Search Tool
// ============================================

const OLLAMA_WEB_SEARCH_URL = "https://ollama.com/api/web_search"
const OLLAMA_KEYS_CACHE_KEY = "cache:ollama-keys"
const OLLAMA_KEYS_CACHE_TTL = 60 // 1 minute TTL in seconds

// Round-robin index for key rotation (in-memory, resets on cold start)
let currentKeyIndex = 0

// Ollama web search response type
interface OllamaWebSearchResult {
    title: string
    url: string
    content: string
}

interface OllamaWebSearchResponse {
    results: OllamaWebSearchResult[]
}

/**
 * Get the next Ollama API key using round-robin rotation
 * If a key hits rate limit, it will try the next key
 */
/**
 * Get cached Ollama keys from KV, refreshing from database if cache expired
 */
async function getCachedOllamaKeys(): Promise<Array<{ id: number; key: string }>> {
    // Try to get from KV cache first
    const cached = await getKV<Array<{ id: number; key: string }>>(OLLAMA_KEYS_CACHE_KEY, "json")
    if (cached && cached.length > 0) {
        logger.debug('Using cached Ollama API keys from KV', { keyCount: cached.length })
        return cached
    }

    // Cache miss or expired, fetch from database
    const db = await getDb()
    const keys = await db.select().from(ollamaKeys)

    // Cache in KV with TTL
    if (keys.length > 0) {
        await putKV(OLLAMA_KEYS_CACHE_KEY, JSON.stringify(keys), { expirationTtl: OLLAMA_KEYS_CACHE_TTL })
        logger.debug('Cached Ollama API keys to KV', { keyCount: keys.length })
    }

    return keys
}

/**
 * Get the next Ollama API key using round-robin rotation
 * If a key hits rate limit, it will try the next key
 */
async function getNextOllamaKey(): Promise<{ id: number; key: string } | null> {
    const keys = await getCachedOllamaKeys()

    if (keys.length === 0) {
        logger.warn('No Ollama API keys found in database')
        return null
    }

    // Get current key and advance index for next call
    const keyData = keys[currentKeyIndex % keys.length]
    currentKeyIndex = (currentKeyIndex + 1) % keys.length

    logger.debug('Selected Ollama API key', { keyId: keyData.id, keyIndex: currentKeyIndex })
    return { id: keyData.id, key: keyData.key }
}

/**
 * Perform web search using Ollama API with automatic key rotation on rate limit
 */
async function performOllamaWebSearch(query: string, maxRetries = 3): Promise<OllamaWebSearchResponse> {
    const keys = await getCachedOllamaKeys()

    if (keys.length === 0) {
        throw new Error('No Ollama API keys configured')
    }

    let lastError: Error | null = null

    // Try up to maxRetries times with different keys
    for (let attempt = 0; attempt < Math.min(maxRetries, keys.length); attempt++) {
        const keyData = await getNextOllamaKey()
        if (!keyData) {
            throw new Error('No Ollama API keys available')
        }

        try {
            logger.info('Attempting Ollama web search', { query, keyId: keyData.id, attempt: attempt + 1 })

            const response = await ky.post(OLLAMA_WEB_SEARCH_URL, {
                headers: {
                    'Authorization': `Bearer ${keyData.key}`,
                    'Content-Type': 'application/json',
                },
                json: { query },
                timeout: 15000, // 15 second timeout for better CPU efficiency
            }).json<OllamaWebSearchResponse>()

            logger.info('Ollama web search successful', { query, resultCount: response.results?.length ?? 0 })
            return response

        } catch (error) {
            lastError = error as Error

            // Check if it's a rate limit error (429)
            if (error instanceof HTTPError && error.response.status === 429) {
                logger.warn('Ollama API rate limit hit, trying next key', {
                    keyId: keyData.id,
                    attempt: attempt + 1,
                    maxRetries
                })
                continue // Try next key
            }

            // For other errors, log and rethrow
            logger.error('Ollama web search error', {
                query,
                keyId: keyData.id,
                error: String(error)
            })
            throw error
        }
    }

    // All retries exhausted
    throw lastError ?? new Error('All Ollama API keys exhausted')
}

// Web search tool input schema
export const webSearchInputSchema = z.object({
    query: z
        .string()
        .describe("Câu hỏi hoặc từ khóa cần tìm kiếm trên web"),
    reasoning: z
        .string()
        .describe("Giải thích tại sao bạn cần tìm kiếm thông tin này trên web"),
})

// Inferred type for web search tool input
export type WebSearchToolInput = z.infer<typeof webSearchInputSchema>

// Tool UI part type for web search tool
export type WebSearchToolUI = {
    type: "tool-webSearchTool"
    state: "input-streaming" | "input-available" | "output-available" | "output-error"
    input: Partial<WebSearchToolInput>
    output?: OllamaWebSearchResponse
    errorText?: string
}

// Web search tool definition for type inference
const webSearchToolDef = tool({
    description: "Web search tool",
    inputSchema: webSearchInputSchema,
    execute: async () => ({ results: [] }),
})

export const createWebSearchTool = () =>
    tool({
        description: "Tìm kiếm thông tin trên internet, sử dụng khi cần thông tin mới nhất hoặc thông tin không có trong cơ sở dữ liệu nội bộ",
        inputSchema: webSearchInputSchema,
        execute: async ({
            query,
            reasoning,
        }: WebSearchToolInput) => {
            try {
                logger.info('Web search tool executing', { query, reasoning })

                const response = await performOllamaWebSearch(query)

                if (!response.results || response.results.length === 0) {
                    return {
                        success: true,
                        data: [],
                        count: 0,
                        reasoning,
                        message: "Không tìm thấy kết quả tìm kiếm",
                    }
                }

                return {
                    success: true,
                    data: response.results,
                    count: response.results.length,
                    reasoning,
                }
            } catch (error) {
                logger.error('Web search tool error', { query, error: String(error) })
                return {
                    success: false,
                    error: `Web search failed: ${error}`,
                    reasoning,
                }
            }
        },
    })

// Single source of truth for semantic search tool input schema
export const semanticSearchInputSchema = z.object({
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
})

// Inferred type for semantic search tool input - use this as single source of truth
export type SemanticSearchToolInput = z.infer<typeof semanticSearchInputSchema>

// Tool UI part type for semantic search tool - matches AI SDK's tool-{toolName} pattern
// The part.type will be "tool-semanticSearchTool"
export type SemanticSearchToolUI = {
    type: "tool-semanticSearchTool"
    state: "input-streaming" | "input-available" | "output-available" | "output-error"
    input: Partial<SemanticSearchToolInput>
    output?: unknown
    errorText?: string
}

// Define the tools object shape for type inference
// We use a function to create the actual tools, but this type represents the shape
const semanticSearchToolDef = tool({
    description: "Semantic search tool",
    inputSchema: semanticSearchInputSchema,
    execute: async () => ({ success: true }),
})

// Type for the playground tools - use this with InferUITools
export type PlaygroundToolSet = {
    semanticSearchTool: typeof semanticSearchToolDef
    webSearchTool: typeof webSearchToolDef
}

// Inferred UI tools type - use this with UIMessage<unknown, unknown, PlaygroundUITools>
export type PlaygroundUITools = InferUITools<PlaygroundToolSet>

// Custom UIMessage type for playground with proper tool typing
export type PlaygroundUIMessage = UIMessage<unknown, never, PlaygroundUITools>

export const createSemanticSearchTool = (
    agent: AgentDetailResolved
) =>
    tool({
        description: "Tìm thông tin theo ngữ cảnh, luôn sử dụng tool này khi người dùng hỏi về một vấn đề, trường hợp không có kết quả, hãy trả lời không biết",
        inputSchema: semanticSearchInputSchema,
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
                const vectorResults = await searchVectors(query, agent.datasourceGroups.map(g => g.id), agent.topK ?? 20)

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

export function createAgentTools(agent: AgentDetailResolved) {
    logger.debug('Creating agent tools', { agentId: agent.id })
    return {
        semanticSearchTool: createSemanticSearchTool(agent),
        webSearchTool: createWebSearchTool(),
    }
}
