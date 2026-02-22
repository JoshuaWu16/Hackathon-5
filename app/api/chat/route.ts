import {
  streamText,
  convertToModelMessages,
  stepCountIs,
  UIMessage,
} from "ai"
import { agentTools } from "@/lib/tools"
import { AGENT_SYSTEM_PROMPT } from "@/lib/agent-prompt"

export const maxDuration = 120

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json()

  const result = streamText({
    model: "anthropic/claude-sonnet-4-20250514",
    system: AGENT_SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    tools: agentTools,
    stopWhen: stepCountIs(15),
    toolChoice: "auto",
    maxOutputTokens: 16000,
  })

  return result.toUIMessageStreamResponse()
}
