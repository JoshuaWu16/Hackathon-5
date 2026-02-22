import { cn } from "@/lib/utils"
import type { UIMessage } from "ai"
import { Bot, User } from "lucide-react"

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
      className={cn("flex gap-3 py-4", isUser ? "justify-end" : "justify-start")}
    >
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Bot className="h-4 w-4" />
        </div>
      )}

      <div
        className={cn(
          "flex max-w-[85%] flex-col gap-2 rounded-lg px-4 py-3 text-sm leading-relaxed",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-card text-card-foreground border border-border"
        )}
      >
        {toolInvocations && toolInvocations.length > 0 && (
          <div className="flex flex-col gap-1">
            {toolInvocations.map((part, i) => {
              if (part.type !== "tool-invocation") return null
              return (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-md bg-muted px-3 py-1.5 text-xs text-muted-foreground font-mono"
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      part.state === "output-available"
                        ? "bg-emerald-500"
                        : "bg-amber-500 animate-pulse"
                    )}
                  />
                  <span>
                    {part.toolCallId}
                    {part.state !== "output-available" && "..."}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {text && <div className="whitespace-pre-wrap">{text}</div>}
      </div>

      {isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
          <User className="h-4 w-4" />
        </div>
      )}
    </div>
  )
}
