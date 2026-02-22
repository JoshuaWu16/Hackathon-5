"use client"

import { useState, useRef, useEffect } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { ChatMessage } from "@/components/chat-message"
import { ChatInput } from "@/components/chat-input"
import { HardHat, Plus, AlertTriangle } from "lucide-react"

const transport = new DefaultChatTransport({ api: "/api/chat" })

const SUGGESTIONS = [
  "Give me a portfolio health overview",
  "Which projects have the biggest margin risk?",
  "Show me labor cost overruns across all projects",
  "Are there any pending change orders I should worry about?",
]

export default function Home() {
  const [input, setInput] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)

  const { messages, sendMessage, status, setMessages, error } = useChat({
    transport,
  })

  const isLoading = status === "streaming" || status === "submitted"

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSubmit = (text?: string) => {
    const value = text || input.trim()
    if (!value) return
    sendMessage({ text: value })
    setInput("")
  }

  const handleNewChat = () => {
    setMessages([])
    setInput("")
  }

  return (
    <div className="flex h-dvh flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <HardHat className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-foreground">
              HVAC Margin Agent
            </h1>
            <p className="text-xs text-muted-foreground">
              Portfolio margin analysis
            </p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={handleNewChat}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <Plus className="h-3.5 w-3.5" />
            New Chat
          </button>
        )}
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6">
        <div className="mx-auto max-w-3xl">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4">
                <HardHat className="h-7 w-7" />
              </div>
              <h2 className="text-lg font-semibold text-foreground mb-2 text-balance">
                HVAC Portfolio Agent
              </h2>
              <p className="max-w-md text-sm text-muted-foreground leading-relaxed">
                {"Analyze your HVAC construction portfolio \u2014 identify margin risks, investigate labor overruns, track change orders, and more."}
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

          {/* Error state */}
          {error && (
            <div className="flex items-start gap-3 py-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-destructive/10 text-destructive mt-0.5">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                <p className="font-medium">Something went wrong</p>
                <p className="mt-1 text-destructive/80">
                  {error.message || "Failed to get a response. Please try again."}
                </p>
              </div>
            </div>
          )}

          {/* Streaming indicator */}
          {isLoading &&
            messages.length > 0 &&
            !messages[messages.length - 1]?.parts?.some(
              (p) => p.type === "text"
            ) && (
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
