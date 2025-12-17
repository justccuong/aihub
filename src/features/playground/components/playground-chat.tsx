"use client"

import { useCallback, useState } from "react"
import { SendIcon, Trash2Icon, SquareIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Conversation,
    ConversationContent,
    ConversationEmptyState,
    ConversationScrollButton,
} from "@/components/ai-elements/conversation"
import {
    Message,
    MessageContent,
    MessageResponse,
} from "@/components/ai-elements/message"
import {
    PromptInput,
    PromptInputTextarea,
    PromptInputFooter,
    PromptInputButton,
} from "@/components/ai-elements/prompt-input"
import { Loader } from "@/components/ai-elements/loader"
import { SemanticSearchToolUIComponent } from "./semantic-search-tool-ui"
import { WebSearchToolUIComponent } from "./web-search-tool-ui"
import { usePlaygroundChat } from "../hooks/use-playground-chat"
import type { SemanticSearchToolUI, WebSearchToolUI, PlaygroundUIMessage } from "@/features/chat/server/service"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

export interface PlaygroundChatProps {
    agentId: number
    customConfig?: {
        llmId?: number
        systemPrompt?: string
        topK?: number
        temperature?: number
        maxTokens?: number
        datasourceGroupIds?: number[]
    }
}

export const PlaygroundChat = ({ agentId, customConfig }: PlaygroundChatProps) => {
    const [inputValue, setInputValue] = useState("")

    const {
        messages,
        status,
        sendMessage,
        stop,
        clearConversation,
        isHydrated,
    } = usePlaygroundChat({
        agentId,
        customConfig,
    })

    const isLoading = status === "streaming" || status === "submitted"

    const handleSubmit = useCallback(
        (message: { text: string }) => {
            if (!message.text.trim()) return
            sendMessage({
                role: "user",
                parts: [{ type: "text", text: message.text }],
            })
            setInputValue("")
        },
        [sendMessage]
    )

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                if (inputValue.trim() && !isLoading) {
                    handleSubmit({ text: inputValue })
                }
            }
        },
        [inputValue, isLoading, handleSubmit]
    )

    if (!isHydrated) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader size={24} />
            </div>
        )
    }

    // Helper to get text content from message parts
    const getMessageText = (message: PlaygroundUIMessage): string => {
        if (!message.parts) return ""
        return message.parts
            .filter((part): part is { type: "text"; text: string } => part.type === "text")
            .map((part) => part.text)
            .join("")
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b">
                <h2 className="font-semibold">Chat</h2>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={clearConversation}
                                disabled={messages.length === 0}
                            >
                                <Trash2Icon className="size-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Clear conversation</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>

            {/* Messages */}
            <Conversation className="flex-1">
                <ConversationContent className="px-4">
                    {messages.length === 0 ? (
                        <ConversationEmptyState
                            title="Start a conversation"
                            description="Send a message to begin chatting with the agent"
                        />
                    ) : (
                        messages.map((message) => (
                            <Message key={message.id} from={message.role}>
                                <MessageContent>
                                    {message.parts ? (
                                        message.parts.map((part, index) => {
                                            if (part.type === "text") {
                                                return (
                                                    <MessageResponse key={index}>
                                                        {part.text}
                                                    </MessageResponse>
                                                )
                                            }
                                            // Handle tool-semanticSearchTool UI part (AI SDK pattern: tool-{toolName})
                                            if (part.type === "tool-semanticSearchTool") {
                                                return (
                                                    <SemanticSearchToolUIComponent
                                                        key={index}
                                                        toolUI={{
                                                            type: part.type,
                                                            state: part.state,
                                                            input: part.input ?? {},
                                                            output: part.output,
                                                            errorText: part.errorText,
                                                        }}
                                                    />
                                                )
                                            }
                                            // Handle tool-webSearchTool UI part
                                            if (part.type === "tool-webSearchTool") {
                                                return (
                                                    <WebSearchToolUIComponent
                                                        key={index}
                                                        toolUI={{
                                                            type: part.type,
                                                            state: part.state,
                                                            input: part.input ?? {},
                                                            output: part.output,
                                                            errorText: part.errorText,
                                                        }}
                                                    />
                                                )
                                            }
                                            return null
                                        })
                                    ) : (
                                        <MessageResponse>
                                            {getMessageText(message)}
                                        </MessageResponse>
                                    )}
                                </MessageContent>
                            </Message>
                        ))
                    )}

                    {/* Loading indicator */}
                    {isLoading && (
                        <Message from="assistant">
                            <MessageContent>
                                <Loader size={16} />
                            </MessageContent>
                        </Message>
                    )}
                </ConversationContent>
                <ConversationScrollButton />
            </Conversation>

            {/* Input */}
            <div className="p-4 border-t">
                <PromptInput
                    onSubmit={handleSubmit}
                    className="relative"
                >
                    <PromptInputTextarea
                        placeholder="Type a message..."
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={isLoading}
                    />
                    <PromptInputFooter>
                        <div />
                        {isLoading ? (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <PromptInputButton
                                            type="button"
                                            onClick={stop}
                                        >
                                            <SquareIcon className="size-4" />
                                        </PromptInputButton>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Stop</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        ) : (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <PromptInputButton
                                            type="submit"
                                            disabled={!inputValue.trim()}
                                        >
                                            <SendIcon className="size-4" />
                                        </PromptInputButton>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Send message</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                    </PromptInputFooter>
                </PromptInput>
            </div>
        </div>
    )
}
