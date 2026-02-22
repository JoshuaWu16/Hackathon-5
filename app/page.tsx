"use client"

import { useState, useRef, useEffect } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { ChatMessage } from "@/components/chat-message"
import { ChatInput } from "@/components/chat-input"
import { HardHat } from "lucide-react"

const transport = new DefaultChatTransport({ api: "/api/chat" })

const SUGGESTIONS = [
  "How are my projects doing overall?",
  "Which project has the worst margin?",
  "Show me all pending change orders",
  "Are there labor overruns on any projects?",
]

export default function Home() {
  const [input, setInput] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)

  const { messages, sendMessage, status } = useChat({ transport })

  const isLoading = status === "streaming" || status === "submitted"

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  console.log("[v0] Chat status:", status, "Messages:", messages.length)

  const handleSubmit = (text?: string) => {
    const value = text || input.trim()
    if (!value) return
    console.log("[v0] Sending message:", value)
    sendMessage({ text: value })
    setInput("")
  }

  return (
    <div className="flex h-dvh flex-col bg-background">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-border px-6 py-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <HardHat className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-base font-semibold text-foreground">
            HVAC Margin Agent
          </h1>
          <p className="text-xs text-muted-foreground">
            Construction portfolio analysis
          </p>
        </div>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6">
        <div className="mx-auto max-w-3xl">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4">
                <HardHat className="h-7 w-7" />
              </div>
              <h2 className="text-lg font-semibold text-foreground mb-1 text-balance">
                HVAC Construction Margin Agent
              </h2>
              <p className="max-w-md text-sm text-muted-foreground leading-relaxed">
                Ask me about your project portfolio, margins, labor costs,
                change orders, and more.
              </p>
              <div className="mt-6 flex flex-col gap-2">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => handleSubmit(suggestion)}
                    className="rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground text-left"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}

          {isLoading && messages.length > 0 && (
            <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
              <div className="flex gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:0ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:300ms]" />
              </div>
              <span>Analyzing...</span>
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-border bg-background px-6 py-4">
        <div className="mx-auto max-w-3xl">
          <ChatInput
            input={input}
            setInput={setInput}
            onSubmit={() => handleSubmit()}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  )
}
