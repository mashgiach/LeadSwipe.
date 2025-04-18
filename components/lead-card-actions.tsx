"use client"

import { useState, useEffect } from "react"
import { Ban, MoreHorizontal, Trash, Star, Heart, Archive } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import {
  blockLead,
  removeViewedLead,
  saveLead,
  matchLead,
  archiveLead,
  getSavedLeadIds,
  getMatchedLeadIds,
  getArchivedLeadIds,
} from "@/services/lead-service"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/components/ui/use-toast"

interface LeadCardActionsProps {
  leadId: number
  onRemove: () => void
  onBlock: () => void
  onSave?: () => void
  onMatch?: () => void
  onArchive?: () => void
  showArchive?: boolean
}

export function LeadCardActions({
  leadId,
  onRemove,
  onBlock,
  onSave,
  onMatch,
  onArchive,
  showArchive = true,
}: LeadCardActionsProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [showBlockDialog, setShowBlockDialog] = useState(false)
  const [blockReason, setBlockReason] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [isMatched, setIsMatched] = useState(false)
  const [isArchived, setIsArchived] = useState(false)

  useEffect(() => {
    const checkStatus = async () => {
      if (!user) return

      try {
        const savedIds = await getSavedLeadIds(user.id)
        const matchedIds = await getMatchedLeadIds(user.id)
        const archivedIds = await getArchivedLeadIds(user.id)

        setIsSaved(savedIds.includes(leadId))
        setIsMatched(matchedIds.includes(leadId))
        setIsArchived(archivedIds.includes(leadId))
      } catch (error) {
        console.error("Error checking lead status:", error)
      }
    }

    checkStatus()
  }, [user, leadId])

  const handleRemove = async () => {
    if (!user) return

    try {
      await removeViewedLead(user.id, leadId)
      onRemove()
    } catch (error) {
      console.error("Error removing lead:", error)
    }
  }

  const handleBlock = async () => {
    if (!user) return

    setIsSubmitting(true)
    try {
      await blockLead(user.id, leadId, blockReason)
      setShowBlockDialog(false)
      onBlock()
      toast({
        title: "Lead blocked",
        description: "This lead won't appear in your feed anymore.",
      })
    } catch (error) {
      console.error("Error blocking lead:", error)
      toast({
        title: "Error",
        description: "Failed to block lead. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSave = async () => {
    if (!user) return

    try {
      await saveLead(user.id, leadId)
      setIsSaved(true)
      if (onSave) onSave()
      toast({
        title: "Lead saved",
        description: "Lead has been added to your saved leads.",
      })
    } catch (error) {
      console.error("Error saving lead:", error)
      toast({
        title: "Error",
        description: "Failed to save lead. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleMatch = async () => {
    if (!user) return

    try {
      await matchLead(user.id, leadId)
      setIsMatched(true)
      if (onMatch) onMatch()
      toast({
        title: "Lead matched",
        description: "You've matched with this lead!",
      })
    } catch (error) {
      console.error("Error matching lead:", error)
      toast({
        title: "Error",
        description: "Failed to match with lead. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleArchive = async () => {
    if (!user) return

    try {
      const result = await archiveLead(user.id, leadId)
      if (result.success) {
        setIsArchived(true)
        if (onArchive) onArchive()
        toast({
          title: "Lead archived",
          description: "Lead has been moved to your archives.",
        })
      } else {
        throw new Error("Failed to archive lead")
      }
    } catch (error) {
      console.error("Error archiving lead:", error)
      toast({
        title: "Error",
        description: "Failed to archive lead. Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 absolute top-2 right-2 z-10 bg-black/50 rounded-full">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={handleSave}
            disabled={isSaved}
            className={isSaved ? "text-yellow-500 focus:text-yellow-500" : ""}
          >
            <Star className="mr-2 h-4 w-4" />
            {isSaved ? "Saved" : "Save Lead"}
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={handleMatch}
            disabled={isMatched}
            className={isMatched ? "text-pink-500 focus:text-pink-500" : ""}
          >
            <Heart className="mr-2 h-4 w-4" />
            {isMatched ? "Matched" : "Match with Lead"}
          </DropdownMenuItem>

          {showArchive && (
            <DropdownMenuItem
              onClick={handleArchive}
              disabled={isArchived}
              className={isArchived ? "text-blue-500 focus:text-blue-500" : ""}
            >
              <Archive className="mr-2 h-4 w-4" />
              {isArchived ? "Archived" : "Archive Lead"}
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={handleRemove} className="text-amber-500 focus:text-amber-500">
            <Trash className="mr-2 h-4 w-4" />
            Remove (Show Later)
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => setShowBlockDialog(true)}
            className="text-destructive focus:text-destructive"
          >
            <Ban className="mr-2 h-4 w-4" />
            Block Lead
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <DialogContent className="sm:max-w-md border-border/30 bg-white dark:bg-gray-900">
          <DialogHeader>
            <DialogTitle>Block Lead</DialogTitle>
            <DialogDescription>
              This lead will be blocked and won't appear in your feed again. You can unblock leads from the blocked
              leads page.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Reason for blocking (optional)"
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBlockDialog(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleBlock} disabled={isSubmitting}>
              {isSubmitting ? "Blocking..." : "Block Lead"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
