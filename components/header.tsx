"use client"

import { Activity, Shield } from "lucide-react"

export function Header() {
  return (
    <header className="flex items-center justify-between border-b border-border bg-card/50 backdrop-blur-sm px-4 py-3 md:px-8">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
          <Shield className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-foreground tracking-tight">
            Margin Rescue
          </h1>
          <p className="text-[10px] text-muted-foreground">
            HVAC Portfolio Intelligence
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-success/10 border border-success/20">
          <Activity className="h-3 w-3 text-success" />
          <span className="text-[10px] font-medium text-success">
            Agent Online
          </span>
        </div>
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary text-muted-foreground">
          <span className="text-[10px] font-mono">5 Projects</span>
          <span className="text-muted-foreground/40">|</span>
          <span className="text-[10px] font-mono">$101M Portfolio</span>
        </div>
      </div>
    </header>
  )
}
