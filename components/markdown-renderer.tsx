"use client"

import ReactMarkdown from "react-markdown"

interface MarkdownRendererProps {
  content: string
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <ReactMarkdown
      components={{
        h1: ({ children }) => (
          <h1 className="text-xl font-bold mt-4 mb-2 text-foreground">
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-lg font-semibold mt-3 mb-1.5 text-foreground">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-base font-semibold mt-2 mb-1 text-foreground">
            {children}
          </h3>
        ),
        p: ({ children }) => (
          <p className="mb-2 leading-relaxed text-foreground/90">{children}</p>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-foreground">{children}</strong>
        ),
        ul: ({ children }) => (
          <ul className="mb-2 ml-4 list-disc space-y-0.5 text-foreground/90">
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className="mb-2 ml-4 list-decimal space-y-0.5 text-foreground/90">
            {children}
          </ol>
        ),
        li: ({ children }) => (
          <li className="leading-relaxed">{children}</li>
        ),
        code: ({ children, className }) => {
          const isInline = !className
          if (isInline) {
            return (
              <code className="px-1 py-0.5 bg-secondary rounded text-xs font-mono text-foreground">
                {children}
              </code>
            )
          }
          return (
            <code className="block p-3 my-2 bg-secondary rounded-md text-xs font-mono text-foreground overflow-x-auto">
              {children}
            </code>
          )
        },
        pre: ({ children }) => <pre className="my-2">{children}</pre>,
        table: ({ children }) => (
          <div className="my-2 overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">{children}</table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-secondary/50">{children}</thead>
        ),
        th: ({ children }) => (
          <th className="px-3 py-1.5 text-left text-xs font-semibold text-foreground">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="px-3 py-1.5 text-xs text-foreground/90 border-t border-border">
            {children}
          </td>
        ),
        hr: () => <hr className="my-3 border-border" />,
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-primary pl-3 my-2 text-muted-foreground italic">
            {children}
          </blockquote>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  )
}
