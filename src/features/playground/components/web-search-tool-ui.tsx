"use client"

import { GlobeIcon } from "lucide-react"
import {
    Reasoning,
    ReasoningTrigger,
    ReasoningContent,
} from "@/components/ai-elements/reasoning"
import type { WebSearchToolUI } from "@/features/chat/server/service"
import { cn } from "@/lib/utils"

export interface WebSearchToolUIProps {
    toolUI: WebSearchToolUI
    className?: string
}

/**
 * Custom UI component for the webSearchTool
 * Shows a Reasoning component with the reasoning text when the tool is being called
 */
export const WebSearchToolUIComponent = ({
    toolUI,
    className,
}: WebSearchToolUIProps) => {
    const { state, input } = toolUI
    const isSearching = state === "input-streaming" || state === "input-available"

    const reasoningText = input.reasoning || "Searching the web..."

    return (
        <div className={cn("py-2", className)}>
            <Reasoning isStreaming={isSearching} defaultOpen>
                <ReasoningTrigger>
                    <GlobeIcon className="size-4" />
                    <span>Web Search</span>
                </ReasoningTrigger>
                <ReasoningContent>
                    {reasoningText}
                </ReasoningContent>
            </Reasoning>
        </div>
    )
}
