"use client"

import { ArrowUp } from "lucide-react"

interface ChatInputProps {
  input: string
  setInput: (value: string) => void
  onSubmit: () => void
  isLoading: boolean
}

export function ChatInput({
  input,
  setInput,
  onSubmit,
  isLoading,
}: ChatInputProps) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!input.trim() || isLoading) return
        onSubmit()
      }}
      className="flex items-end gap-2 rounded-xl border border-border bg-card p-2 shadow-sm"
    >
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            if (!input.trim() || isLoading) return
            onSubmit()
          }
        }}
        placeholder="Ask about your HVAC portfolio..."
        rows={1}
        className="flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground"
        disabled={isLoading}
      />
      <button
        type="submit"
        disabled={!input.trim() || isLoading}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-opacity disabled:opacity-40"
        aria-label="Send message"
      >
        <ArrowUp className="h-4 w-4" />
      </button>
    </form>
  )
}
