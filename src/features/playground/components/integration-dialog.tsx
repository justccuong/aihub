"use client"

import { useState } from "react"
import { CodeIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogTrigger,
} from "@/components/ui/dialog"
import { CodeTabs } from "@/components/ui/shadcn-io/code-tabs"

export interface IntegrationDialogProps {
    agentId: number
}

export const IntegrationDialog = ({ agentId }: IntegrationDialogProps) => {
    const [open, setOpen] = useState(false)

    const codes = {
        "React (AI SDK)": `import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { useMemo, useState, FormEvent } from "react"

export default function Chat() {
    // Create transport with custom API endpoint
    const transport = useMemo(() => {
        return new DefaultChatTransport({
            api: "https://aihub.jsclub.dev/api/chat/completions/${agentId}",
        })
    }, [])

    const { messages, status, sendMessage, error } = useChat({
        id: "my-chat",
        transport,
    })

    const [input, setInput] = useState<string>("")

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (!input.trim()) return
        sendMessage(input)
        setInput("")
    }

    return (
        <div>
            {messages.map((message) => (
                <div key={message.id}>
                    {message.role === "user" ? "User: " : "AI: "}
                    {message.parts.map((part, i) => {
                        if (part.type === "text") {
                            return <span key={i}>{part.text}</span>
                        }
                        if (part.type === "tool-call") {
                            return <div key={i}>Tool call: {part.toolName}</div>
                        }
                        return null
                    })}
                </div>
            ))}

            {error && (
                <div style={{ color: "red" }}>
                    Error: {error.message}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    value={input}
                    placeholder="Say something..."
                    onChange={(e) => setInput(e.target.value)}
                    disabled={status === "streaming" || status === "submitted"}
                />
                <button 
                    type="submit" 
                    disabled={status !== "ready" || !input.trim()}
                >
                    {status === "streaming" ? "Sending..." : "Send"}
                </button>
            </form>
        </div>
    )
}`,
        "cURL": `curl --request POST \\
  --url ${"https://aihub.jsclub.dev"}/api/chat/completions/${agentId} \\
  --header 'content-type: application/json' \\
  --data '{
  "stream": true,
  "messages": [
    {
      "id": "test",
      "role": "user",
      "parts": [
        {
          "type": "text",
          "text": "Hello"
        }
      ]
    }
  ]
}'`,
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <CodeIcon className="size-4" />
                    Integrate
                </Button>
            </DialogTrigger>
            <DialogContent className="w-full sm:!max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Integration Instructions</DialogTitle>
                    <DialogDescription>
                        Use the code snippets below to integrate this agent into your application.
                    </DialogDescription>
                </DialogHeader>
                <div className="mt-4 overflow-hidden">
                    <CodeTabs codes={codes} lang="typescript" />
                </div>
            </DialogContent>
        </Dialog>
    )
}
