"use client"

import { cn } from "@/lib/utils"
import type { UIMessage } from "ai"
import { Bot, User, Wrench } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

const TOOL_LABELS: Record<string, string> = {
  getContracts: "Fetching contracts",
  getSOV: "Loading schedule of values",
  getLaborLogs: "Analyzing labor logs",
  getMaterialDeliveries: "Checking material deliveries",
  getChangeOrders: "Reviewing change orders",
  getRFIs: "Looking up RFIs",
  getFieldNotes: "Scanning field notes",
  getBillingHistory: "Loading billing history",
  getBillingLineItems: "Checking billing line items",
  getSOVBudget: "Loading SOV budget",
}

function getUIMessageText(msg: UIMessage): string {
  if (!msg.parts || !Array.isArray(msg.parts)) return ""
  return msg.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("")
}

export function ChatMessage({ message }: { message: UIMessage }) {
  const isUser = message.role === "user"
  const text = getUIMessageText(message)

  const toolInvocations = message.parts?.filter(
    (p) => p.type === "tool-invocation"
  )

  return (
    <div
      className={cn(
        "flex gap-3 py-4",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground mt-0.5">
          <Bot className="h-4 w-4" />
        </div>
      )}

      <div
        className={cn(
          "flex max-w-[85%] flex-col gap-2 rounded-lg px-4 py-3 text-sm",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-card text-card-foreground border border-border"
        )}
      >
        {toolInvocations && toolInvocations.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {toolInvocations.map((part, i) => {
              if (part.type !== "tool-invocation") return null
              const isDone = part.state === "output-available"
              const label =
                TOOL_LABELS[part.toolName as string] || part.toolName
              return (
                <div
                  key={i}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium",
                    isDone
                      ? "bg-emerald-500/10 text-emerald-700"
                      : "bg-amber-500/10 text-amber-700"
                  )}
                >
                  <Wrench className="h-3 w-3" />
                  <span>
                    {label}
                    {!isDone && "..."}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {text &&
          (isUser ? (
            <div className="whitespace-pre-wrap leading-relaxed">{text}</div>
          ) : (
            <div className="prose prose-sm max-w-none prose-headings:text-card-foreground prose-p:text-card-foreground prose-strong:text-card-foreground prose-li:text-card-foreground prose-td:text-card-foreground prose-th:text-card-foreground prose-a:text-primary">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
            </div>
          ))}
      </div>

      {isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground mt-0.5">
          <User className="h-4 w-4" />
        </div>
      )}
    </div>
  )
}
