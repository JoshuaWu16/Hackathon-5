import {
  streamText,
  convertToModelMessages,
  consumeStream,
  stepCountIs,
  UIMessage,
} from "ai"
import { agentTools } from "@/lib/tools"
import { AGENT_SYSTEM_PROMPT } from "@/lib/agent-prompt"

export const maxDuration = 120

export async function POST(req: Request) {
  try {
    const { messages }: { messages: UIMessage[] } = await req.json()

    const result = streamText({
      model: "anthropic/claude-sonnet-4-20250514",
      system: AGENT_SYSTEM_PROMPT,
      messages: await convertToModelMessages(messages),
      tools: agentTools,
      stopWhen: stepCountIs(15),
      toolChoice: "auto",
      maxOutputTokens: 16000,
      abortSignal: req.signal,
    })

    return result.toUIMessageStreamResponse({
      consumeSseStream: consumeStream,
    })
  } catch (error) {
    console.error("[v0] Chat API error:", error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
}
