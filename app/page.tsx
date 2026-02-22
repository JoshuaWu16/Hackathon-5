import { Header } from "@/components/header"
import { ChatInterface } from "@/components/chat-interface"

export default function Home() {
  return (
    <main className="flex flex-col h-dvh bg-background">
      <Header />
      <ChatInterface />
    </main>
  )
}
