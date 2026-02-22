"use client"

import { useMemo } from "react"

interface MarkdownRendererProps {
  content: string
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

function parseInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="px-1 py-0.5 bg-secondary rounded text-xs font-mono text-foreground">$1</code>')
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const html = useMemo(() => {
    if (!content) return ""
    const lines = content.split("\n")
    const result: string[] = []
    let inList = false
    let listType: "ul" | "ol" = "ul"
    let inCodeBlock = false
    let codeContent: string[] = []

    function closeList() {
      if (inList) {
        result.push(listType === "ul" ? "</ul>" : "</ol>")
        inList = false
      }
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      // Code blocks
      if (line.trim().startsWith("```")) {
        if (inCodeBlock) {
          result.push(
            `<pre class="my-2"><code class="block p-3 my-2 bg-secondary rounded-md text-xs font-mono text-foreground overflow-x-auto">${escapeHtml(codeContent.join("\n"))}</code></pre>`
          )
          codeContent = []
          inCodeBlock = false
        } else {
          closeList()
          inCodeBlock = true
        }
        continue
      }
      if (inCodeBlock) {
        codeContent.push(line)
        continue
      }

      // Headers
      if (line.startsWith("### ")) {
        closeList()
        result.push(`<h3 class="text-base font-semibold mt-2 mb-1 text-foreground">${parseInline(escapeHtml(line.slice(4)))}</h3>`)
        continue
      }
      if (line.startsWith("## ")) {
        closeList()
        result.push(`<h2 class="text-lg font-semibold mt-3 mb-1.5 text-foreground">${parseInline(escapeHtml(line.slice(3)))}</h2>`)
        continue
      }
      if (line.startsWith("# ")) {
        closeList()
        result.push(`<h1 class="text-xl font-bold mt-4 mb-2 text-foreground">${parseInline(escapeHtml(line.slice(2)))}</h1>`)
        continue
      }

      // Horizontal rule
      if (line.trim() === "---" || line.trim() === "***") {
        closeList()
        result.push('<hr class="my-3 border-border" />')
        continue
      }

      // Blockquote
      if (line.startsWith("> ")) {
        closeList()
        result.push(`<blockquote class="border-l-2 border-primary pl-3 my-2 text-muted-foreground italic"><p>${parseInline(escapeHtml(line.slice(2)))}</p></blockquote>`)
        continue
      }

      // Unordered list
      const ulMatch = line.match(/^(\s*)[-*]\s+(.+)/)
      if (ulMatch) {
        if (!inList || listType !== "ul") {
          closeList()
          result.push('<ul class="mb-2 ml-4 list-disc space-y-0.5 text-foreground/90">')
          inList = true
          listType = "ul"
        }
        result.push(`<li class="leading-relaxed">${parseInline(escapeHtml(ulMatch[2]))}</li>`)
        continue
      }

      // Ordered list
      const olMatch = line.match(/^(\s*)\d+\.\s+(.+)/)
      if (olMatch) {
        if (!inList || listType !== "ol") {
          closeList()
          result.push('<ol class="mb-2 ml-4 list-decimal space-y-0.5 text-foreground/90">')
          inList = true
          listType = "ol"
        }
        result.push(`<li class="leading-relaxed">${parseInline(escapeHtml(olMatch[2]))}</li>`)
        continue
      }

      // Empty line
      if (line.trim() === "") {
        closeList()
        continue
      }

      // Normal paragraph
      closeList()
      result.push(`<p class="mb-2 leading-relaxed text-foreground/90">${parseInline(escapeHtml(line))}</p>`)
    }

    closeList()
    return result.join("\n")
  }, [content])

  return (
    <div
      className="prose-sm"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
