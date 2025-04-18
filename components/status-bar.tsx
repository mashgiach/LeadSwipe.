"use client"

import { useState } from "react"
import { GlowButton } from "@/components/ui/glow-button"
import { cn } from "@/lib/utils"

interface StatusBarProps {
  onSave: () => void
  onReset: () => void
  className?: string
}

export function StatusBar({ onSave, onReset, className }: StatusBarProps) {
  const [hasChanges, setHasChanges] = useState(true)

  const handleSave = () => {
    onSave()
    setHasChanges(false)
  }

  const handleReset = () => {
    onReset()
    setHasChanges(false)
  }

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-full bg-card px-3 py-1.5 border border-border/20 shadow-sm",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <div className={`h-2 w-2 rounded-full ${hasChanges ? "bg-blue-600" : "bg-muted"}`} />
        <span className="text-sm text-muted-foreground">{hasChanges ? "Unsaved changes" : "All changes saved"}</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={handleReset}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          disabled={!hasChanges}
        >
          Reset
        </button>
        <GlowButton onClick={handleSave} className={`bg-blue-600 text-white px-4 py-1 text-sm`} disabled={!hasChanges}>
          Save
        </GlowButton>
      </div>
    </div>
  )
}
