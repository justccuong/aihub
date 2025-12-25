"use client"

import { useState, useCallback } from "react"
import dynamic from "next/dynamic"
import { MessageCircleIcon, BotIcon, SettingsIcon } from "lucide-react"
import {
    ResizablePanelGroup,
    ResizablePanel,
    ResizableHandle,
} from "@/components/ui/resizable"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useIsMobile } from "@/hooks/use-mobile"
import { usePlaygroundParams } from "../hooks/use-playground-params"
import { Spinner } from "@/components/ui/spinner"
import { AgentSelector } from "./agent-selector"
import { IntegrationDialog } from "./integration-dialog"
import { AgentConfigPanel } from "./agent-config-panel"
import type { PlaygroundChatProps } from "./playground-chat"
import { AppHeader } from "@/components/app-header"

// Dynamic import to exclude heavy AI SDK dependencies from SSR bundle
const PlaygroundChat = dynamic<PlaygroundChatProps>(
    () => import("./playground-chat").then(m => m.PlaygroundChat),
    {
        ssr: false,
        loading: () => (
            <div className="flex h-full items-center justify-center">
                <Spinner className="size-6" />
            </div>
        )
    }
)

const NoAgentSelected = () => (
    <div className="flex-1 flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
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

export const PlaygroundLoading = () => (
    <div className="flex h-full items-center justify-center">
        <Spinner className="size-6" />
    </div>
)

export const PlaygroundError = () => (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
        <BotIcon className="size-8" />
        <p className="text-sm">Failed to load playground</p>
    </div>
)

export const PlaygroundContainer = () => {
    const [agentId] = usePlaygroundParams()
    const isMobile = useIsMobile()
    const [isConfigLoading, setIsConfigLoading] = useState(true)
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

    const handleLoadingChange = useCallback((loading: boolean) => {
        setIsConfigLoading(loading)
    }, [])

    // No agent selected - show selector
    if (!agentId) {
        return <>
            <AppHeader />
            <NoAgentSelected />
        </>
    }

    return (
        <div className="flex flex-col h-full">
            {/* Top bar with agent selector */}
            <AppHeader
                leftToolbar={
                    <AgentSelector />
                }
                rightToolbar={
                    <IntegrationDialog agentId={agentId} />
                }
            />


            {/* Mobile: Tabs layout */}
            {isMobile ? (
                <Tabs defaultValue="chat" className="flex-1 flex flex-col">
                    <TabsList className="w-full rounded-none border-b bg-muted/30">
                        <TabsTrigger value="settings" className="flex-1 gap-2">
                            <SettingsIcon className="size-4" />
                            Settings
                        </TabsTrigger>
                        <TabsTrigger value="chat" className="flex-1 gap-2">
                            <MessageCircleIcon className="size-4" />
                            Chat
                        </TabsTrigger>
                    </TabsList>
                    <TabsContent value="settings" className="flex-1 mt-0 overflow-auto">
                        <div className="h-full bg-muted/30">
                            <AgentConfigPanel
                                agentId={agentId}
                                onConfigChange={handleConfigChange}
                                onLoadingChange={handleLoadingChange}
                            />
                        </div>
                    </TabsContent>
                    <TabsContent value="chat" className="flex-1 mt-0 overflow-hidden">
                        <div className="h-full bg-background">
                            <PlaygroundChat
                                agentId={agentId}
                                customConfig={customConfig}
                                disabled={isConfigLoading}
                            />
                        </div>
                    </TabsContent>
                </Tabs>
            ) : (
                /* Desktop: Resizable panels */
                <ResizablePanelGroup direction="horizontal" className="flex-1">
                    <ResizablePanel defaultSize={30} minSize={20} maxSize={50}>
                        <div className="h-full border-r bg-muted/30">
                            <AgentConfigPanel
                                agentId={agentId}
                                onConfigChange={handleConfigChange}
                                onLoadingChange={handleLoadingChange}
                            />
                        </div>
                    </ResizablePanel>

                    <ResizableHandle withHandle />

                    <ResizablePanel defaultSize={70} minSize={40}>
                        <div className="h-full bg-background">
                            <PlaygroundChat
                                agentId={agentId}
                                customConfig={customConfig}
                                disabled={isConfigLoading}
                            />
                        </div>
                    </ResizablePanel>
                </ResizablePanelGroup>
            )}
        </div>
    )
}