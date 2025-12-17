"use client"

import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { useCallback, useEffect, useState, useMemo } from "react"
import type { PlaygroundUIMessage, PlaygroundUITools } from "@/features/chat/server/service"

const STORAGE_KEY_PREFIX = "playground-chat-"

interface PlaygroundChatConfig {
    llmId?: number
    systemPrompt?: string
    knowledgeSourceGroupId?: number
    topK?: number
    temperature?: number
    maxTokens?: number
    datasourceGroupIds?: number[]
}

interface UsePlaygroundChatOptions {
    agentId: number
    customConfig?: PlaygroundChatConfig
}

/**
 * Hook for playground chat with local storage persistence
 * Uses PlaygroundUIMessage for proper tool typing
 */
export const usePlaygroundChat = ({
    agentId,
    customConfig,
}: UsePlaygroundChatOptions) => {
    const storageKey = `${STORAGE_KEY_PREFIX}${agentId}`
    const [isHydrated, setIsHydrated] = useState(false)

    // Load initial messages from localStorage
    const getInitialMessages = useCallback((): PlaygroundUIMessage[] => {
        if (typeof window === "undefined") return []
        try {
            const stored = localStorage.getItem(storageKey)
            if (stored) {
                return JSON.parse(stored)
            }
        } catch (error) {
            console.error("Failed to load chat history:", error)
        }
        return []
    }, [storageKey])

    // Create transport with custom API endpoint
    const transport = useMemo(() => {
        return new DefaultChatTransport({
            api: `/api/chat/playground/${agentId}`,
            body: {
                stream: true,
                customConfig,
            },
        })
    }, [agentId, customConfig])

    const chat = useChat({
        id: `playground-${agentId}`,
        transport,
        messages: isHydrated ? getInitialMessages() : [],
    })

    // Hydrate from localStorage on mount
    useEffect(() => {
        if (!isHydrated) {
            const storedMessages = getInitialMessages()
            if (storedMessages.length > 0) {
                chat.setMessages(storedMessages)
            }
            setIsHydrated(true)
        }
    }, [isHydrated, getInitialMessages, chat])

    // Persist messages to localStorage when they change
    useEffect(() => {
        if (isHydrated && chat.messages.length > 0) {
            try {
                localStorage.setItem(storageKey, JSON.stringify(chat.messages))
            } catch (error) {
                console.error("Failed to save chat history:", error)
            }
        }
    }, [chat.messages, storageKey, isHydrated])

    // Clear conversation and localStorage
    const clearConversation = useCallback(() => {
        chat.setMessages([])
        try {
            localStorage.removeItem(storageKey)
        } catch (error) {
            console.error("Failed to clear chat history:", error)
        }
    }, [chat, storageKey])

    return {
        ...chat,
        clearConversation,
        isHydrated,
    }
}
