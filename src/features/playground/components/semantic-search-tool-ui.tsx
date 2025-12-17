"use client"

import {
    Reasoning,
    ReasoningTrigger,
    ReasoningContent,
} from "@/components/ai-elements/reasoning"
import type { SemanticSearchToolUI } from "@/features/chat/server/service"
import { cn } from "@/lib/utils"

export interface SemanticSearchToolUIProps {
    toolUI: SemanticSearchToolUI
    className?: string
}

/**
 * Custom UI component for the semanticSearchTool
 * Shows a Reasoning component with the reasoning text when the tool is being called
 */
export const SemanticSearchToolUIComponent = ({
    toolUI,
    className,
}: SemanticSearchToolUIProps) => {
    const { state, input } = toolUI
    const isSearching = state === "input-streaming" || state === "input-available"

    const reasoningText = input.reasoning || "Searching..."

    return (
        <div className={cn("py-2", className)}>
            <Reasoning isStreaming={isSearching} defaultOpen>
                <ReasoningTrigger />
                <ReasoningContent>
                    {reasoningText}
                </ReasoningContent>
            </Reasoning>
        </div>
    )
}

