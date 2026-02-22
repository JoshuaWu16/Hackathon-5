"use client"

import { useState, useRef, useEffect } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { Send, Bot, User, Loader2, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { ToolActivity } from "./tool-activity"
import { MarkdownRenderer } from "./markdown-renderer"

const SUGGESTED_PROMPTS = [
  "How's my portfolio doing?",
  "Which project has the worst margin erosion?",
  "Show me all pending change orders across the portfolio",
  "Analyze overtime trends across all projects",
  "What does the field data say about project delays?",
]

export function ChatInterface() {
  const [input, setInput] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  })

  const isLoading = status !== "ready"

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSubmit = (text?: string) => {
    const message = text || input.trim()
    if (!message || isLoading) return
    sendMessage({ text: message })
    setInput("")
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center pt-16 pb-8">
              <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-6">
                <Sparkles className="h-7 w-7 text-primary" />
              </div>
              <h2 className="text-2xl font-semibold text-foreground mb-2 text-balance text-center">
                HVAC Margin Rescue Agent
              </h2>
              <p className="text-muted-foreground text-sm max-w-md text-center mb-8 leading-relaxed">
                {"I'm an autonomous AI agent that scans your HVAC project portfolio, investigates margin erosion, and produces actionable intelligence."}
              </p>
              <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => handleSubmit(prompt)}
                    className="px-3 py-1.5 text-xs rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-primary/5 transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div key={message.id}>
              {message.role === "user" ? (
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-secondary flex items-center justify-center mt-0.5">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-muted-foreground mb-1">You</p>
                    <p className="text-sm text-foreground">
                      {message.parts
                        .filter((p): p is { type: "text"; text: string } => p.type === "text")
                        .map((p) => p.text)
                        .join("")}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center mt-0.5">
                    <Bot className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-primary mb-1">Agent</p>
                    <div className="text-sm">
                      {message.parts.map((part, index) => {
                        if (part.type === "text") {
                          return part.text ? <MarkdownRenderer key={index} content={part.text} /> : null
                        }
                        if (part.type === "step-start") {
                          return null
                        }
                        if (part.type.startsWith("tool-")) {
                          const toolName = part.type.replace("tool-", "")
                          const toolPart = part as Record<string, unknown>
                          return (
                            <ToolActivity
                              key={index}
                              toolName={toolName}
                              input={(toolPart.input as Record<string, unknown>) ?? {}}
                              output={toolPart.output}
                              state={(toolPart.state as string) ?? "input-available"}
                            />
                          )
                        }
                        return null
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {isLoading && messages.length > 0 && (
            <div className="flex items-center gap-2 text-muted-foreground text-xs pl-10">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Agent is thinking...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="border-t border-border bg-background/80 backdrop-blur-sm px-4 py-3 md:px-8">
        <div className="max-w-3xl mx-auto">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSubmit()
            }}
          >
            <div className="flex items-end gap-2 bg-card border border-border rounded-xl px-4 py-2 focus-within:border-primary/40 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your portfolio, a specific project, or request an action..."
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none py-1.5"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className={cn(
                  "flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg transition-colors",
                  input.trim() && !isLoading
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-secondary text-muted-foreground cursor-not-allowed"
                )}
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </form>
          <p className="text-[10px] text-muted-foreground/60 mt-1.5 text-center">
            Agent analyzes ~18K records across 5 projects. Responses may take a moment.
          </p>
        </div>
      </div>
    </div>
  )
}
