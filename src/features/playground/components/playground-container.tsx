"use client"

import { useState, useCallback } from "react"
import { MessageCircleIcon } from "lucide-react"
import {
    ResizablePanelGroup,
    ResizablePanel,
    ResizableHandle,
} from "@/components/ui/resizable"
import { usePlaygroundParams } from "../hooks/use-playground-params"
import dynamic from "next/dynamic"
import type { IntegrationDialogProps } from "./integration-dialog"
import type { AgentConfigPanelProps } from "./agent-config-panel"
import type { PlaygroundChatProps } from "./playground-chat"

// Dynamically import all heavy components to reduce bundle size
const AgentSelector = dynamic(
    () => import("./agent-selector").then((mod) => mod.AgentSelector),
    { ssr: false }
)

const AgentConfigPanel = dynamic<AgentConfigPanelProps>(
    () => import("./agent-config-panel").then((mod) => mod.AgentConfigPanel),
    { ssr: false }
)

const PlaygroundChat = dynamic<PlaygroundChatProps>(
    () => import("./playground-chat").then((mod) => mod.PlaygroundChat),
    { ssr: false }
)

const IntegrationDialog = dynamic<IntegrationDialogProps>(
    () => import("./integration-dialog").then((mod) => mod.IntegrationDialog),
    { ssr: false }
)

const NoAgentSelected = () => (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
        <div className="size-16 bg-primary/10 rounded-full flex items-center justify-center">
            <MessageCircleIcon className="size-8 text-primary" />
        </div>
        <div className="space-y-2">
            <h2 className="text-xl font-semibold">Select an Agent</h2>
            <p className="text-muted-foreground max-w-md">
                Choose an agent from the dropdown above to start chatting.
                You can configure the agent settings and test conversations.
            </p>
        </div>
        <div className="w-full max-w-sm pt-4">
            <AgentSelector />
        </div>
    </div>
)
export const PlaygroundContainer = () => {
    const [agentId] = usePlaygroundParams()
    const [customConfig, setCustomConfig] = useState<{
        llmId?: number
        systemPrompt?: string
        topK?: number
        temperature?: number
        maxTokens?: number
        datasourceGroupIds?: number[]
    }>({})

    const handleConfigChange = useCallback((config: typeof customConfig) => {
        setCustomConfig(config)
    }, [])

    // No agent selected - show selector
    if (!agentId) {
        return <NoAgentSelected />
    }

    return (
        <div className="flex flex-col h-full">
            {/* Top bar with agent selector */}
            <div className="flex items-center justify-between gap-4 p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="flex-1 max-w-sm">
                    <AgentSelector />
                </div>
                <IntegrationDialog agentId={agentId} />
            </div>

            {/* Main content with resizable panels */}
            <ResizablePanelGroup direction="horizontal" className="flex-1">
                {/* Left panel - Agent Config */}
                <ResizablePanel defaultSize={30} minSize={20} maxSize={50}>
                    <div className="h-full border-r bg-muted/30">
                        <AgentConfigPanel
                            agentId={agentId}
                            onConfigChange={handleConfigChange}
                        />
                    </div>
                </ResizablePanel>

                <ResizableHandle withHandle />

                {/* Right panel - Chat */}
                <ResizablePanel defaultSize={70} minSize={40}>
                    <div className="h-full bg-background">
                        <PlaygroundChat
                            agentId={agentId}
                            customConfig={customConfig}
                        />
                    </div>
                </ResizablePanel>
            </ResizablePanelGroup>
        </div>
    )
}
