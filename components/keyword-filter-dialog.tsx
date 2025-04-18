"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Plus, X } from "lucide-react"

interface KeywordFilterDialogProps {
  open: boolean
  onClose: () => void
  keywords?: string[]
  onKeywordsChange: (keywords: string[]) => void
  onFilter?: (keywords: string[]) => void
}

export function KeywordFilterDialog({
  open,
  onClose,
  keywords = [],
  onKeywordsChange,
  onFilter,
}: KeywordFilterDialogProps) {
  const [newKeyword, setNewKeyword] = useState("")
  const [localKeywords, setLocalKeywords] = useState<string[]>(keywords)

  // Update local keywords when the keywords prop changes
  useEffect(() => {
    setLocalKeywords(keywords || [])
  }, [keywords])

  const handleAddKeyword = () => {
    if (!newKeyword.trim()) return

    const keyword = newKeyword.trim()
    if (!localKeywords.includes(keyword)) {
      setLocalKeywords([...localKeywords, keyword])
    }
    setNewKeyword("")
  }

  const handleRemoveKeyword = (index: number) => {
    setLocalKeywords(localKeywords.filter((_, i) => i !== index))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAddKeyword()
    }
  }

  const handleSave = () => {
    onKeywordsChange(localKeywords)
    if (onFilter) {
      onFilter(localKeywords)
    }
    onClose()
  }

  const handleClose = () => {
    setLocalKeywords(keywords || [])
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md border-border/30 bg-card shadow-lg shopify-card">
        <DialogHeader>
          <DialogTitle className="text-blue-700 dark:text-blue-400">Filter by Keywords</DialogTitle>
          <DialogDescription>Add keywords to filter leads that match any of these terms.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex gap-2">
            <Input
              placeholder="Add keyword..."
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              onKeyDown={handleKeyDown}
              className="shopify-input"
            />
            <Button
              variant="outline"
              onClick={handleAddKeyword}
              disabled={!newKeyword.trim()}
              className="shopify-button"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-wrap gap-2 min-h-[100px] max-h-[200px] overflow-y-auto p-2 border border-border/30 rounded-md bg-background">
            {localKeywords.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                No keywords added
              </div>
            ) : (
              localKeywords.map((keyword, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="bg-blue-100 text-blue-700 border border-blue-300 flex items-center gap-1 dark:bg-blue-900/40 dark:text-blue-400 dark:border-blue-800/50"
                >
                  {keyword}
                  <button
                    className="hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5"
                    onClick={() => handleRemoveKeyword(index)}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))
            )}
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={handleClose} className="shopify-button">
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white shopify-button">
            Apply Filters
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
