"use client"

import { useState } from "react"
import {
  Search,
  BarChart3,
  FileText,
  DollarSign,
  TrendingUp,
  Package,
  AlertTriangle,
  Mail,
  ChevronDown,
  ChevronRight,
  Wrench,
  Users,
} from "lucide-react"
import { cn } from "@/lib/utils"

const TOOL_META: Record<
  string,
  { label: string; icon: React.ElementType; color: string }
> = {
  getPortfolioOverview: {
    label: "Scanning Portfolio",
    icon: BarChart3,
    color: "text-primary",
  },
  analyzeProjectMargin: {
    label: "Analyzing Margin",
    icon: DollarSign,
    color: "text-destructive",
  },
  analyzeLaborProductivity: {
    label: "Analyzing Labor",
    icon: Users,
    color: "text-warning",
  },
  getChangeOrders: {
    label: "Reviewing Change Orders",
    icon: FileText,
    color: "text-warning",
  },
  analyzeBillingHealth: {
    label: "Checking Billing Health",
    icon: TrendingUp,
    color: "text-success",
  },
  getRFIAnalysis: {
    label: "Analyzing RFIs",
    icon: AlertTriangle,
    color: "text-warning",
  },
  searchFieldNotes: {
    label: "Searching Field Notes",
    icon: Search,
    color: "text-muted-foreground",
  },
  calculateProjectForecast: {
    label: "Forecasting Outcome",
    icon: TrendingUp,
    color: "text-primary",
  },
  getMaterialAnalysis: {
    label: "Analyzing Materials",
    icon: Package,
    color: "text-muted-foreground",
  },
  sendEmailReport: {
    label: "Sending Email",
    icon: Mail,
    color: "text-primary",
  },
}

interface ToolActivityProps {
  toolName: string
  input: Record<string, unknown>
  output: unknown
  state: string
}

export function ToolActivity({
  toolName,
  input,
  output,
  state,
}: ToolActivityProps) {
  const [expanded, setExpanded] = useState(false)
  const meta = TOOL_META[toolName] || {
    label: toolName,
    icon: Wrench,
    color: "text-muted-foreground",
  }
  const Icon = meta.icon

  const isLoading =
    state === "input-streaming" || state === "input-available"
  const isDone = state === "output-available"
  const isError = state === "output-error"

  return (
    <div className="my-1.5 animate-fade-in">
      <button
        onClick={() => isDone && setExpanded(!expanded)}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-mono transition-colors w-full text-left",
          "bg-secondary/50 hover:bg-secondary",
          isDone && "cursor-pointer",
          isLoading && "cursor-default"
        )}
      >
        {isLoading && (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
          </span>
        )}
        {isDone && (
          <span className="flex h-2 w-2 rounded-full bg-success" />
        )}
        {isError && (
          <span className="flex h-2 w-2 rounded-full bg-destructive" />
        )}
        <Icon className={cn("h-3.5 w-3.5", meta.color)} />
        <span className="text-muted-foreground">
          {isLoading ? meta.label : `${meta.label}`}
          {input &&
            "project_id" in input &&
            input.project_id &&
            ` (${input.project_id})`}
        </span>
        {isDone && (
          <>
            <span className="text-muted-foreground/50 ml-auto">
              {expanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </span>
          </>
        )}
      </button>
      {expanded && isDone && output && (
        <div className="mt-1 ml-6 mr-2 max-h-48 overflow-auto rounded-md bg-card border border-border p-2">
          <pre className="text-[10px] text-muted-foreground font-mono whitespace-pre-wrap break-words">
            {JSON.stringify(output, null, 2).substring(0, 3000)}
            {JSON.stringify(output, null, 2).length > 3000 && "\n...truncated"}
          </pre>
        </div>
      )}
    </div>
  )
}
