"use client"

import { useState, useRef, useEffect } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { ChatMessage } from "@/components/chat-message"
import { ChatInput } from "@/components/chat-input"
import { HardHat } from "lucide-react"

const transport = new DefaultChatTransport({ api: "/api/chat" })

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

  const handleSubmit = () => {
    if (!input.trim()) return
    sendMessage({ text: input })
    setInput("")
  }

  return (
    <div className="flex h-dvh flex-col bg-background">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-border px-6 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <HardHat className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-base font-semibold text-foreground">
            HVAC Margin Agent
          </h1>
          <p className="text-xs text-muted-foreground">
            Portfolio margin analysis and protection
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
              <h2 className="text-lg font-semibold text-foreground mb-2">
                HVAC Portfolio Agent
              </h2>
              <p className="max-w-md text-sm text-muted-foreground leading-relaxed">
                {"I can analyze your HVAC construction portfolio, identify margin risks, investigate labor overruns, track change orders, and more. Try asking:"}
              </p>
              <div className="mt-4 flex flex-col gap-2">
                {[
                  "How's my portfolio doing?",
                  "Which projects have the biggest margin risk?",
                  "Show me labor cost overruns across all projects",
                  "Are there any pending change orders I should worry about?",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => {
                      setInput(suggestion)
                    }}
                    className="rounded-lg border border-border bg-card px-4 py-2 text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
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
            onSubmit={handleSubmit}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  )
}
