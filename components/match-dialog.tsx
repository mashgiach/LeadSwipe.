"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { MessageSquare } from "lucide-react"
import { getTextDirectionClass } from "@/lib/utils"
import type { Lead } from "@/services/lead-service"

// First, let's add the necessary imports at the top
import { useState, useEffect } from "react"
import { MessageGeneratorDialog } from "@/components/message-generator-dialog"
import { Sparkles, ArrowRight } from "lucide-react"
import { useRouter } from "next/navigation"
import { getMatchedLeads } from "@/services/lead-service"
import { useAuth } from "@/contexts/auth-context"

interface MatchDialogProps {
  lead: Lead
  open: boolean
  onClose: () => void
  onUnmatch?: (leadId: number) => void
}

// Update the MatchDialog component to include AI message generation
export function MatchDialog({ lead, open, onClose, onUnmatch }: MatchDialogProps) {
  const [showMessageGenerator, setShowMessageGenerator] = useState(false)
  const [isRemoved, setIsRemoved] = useState(false)
  const [matchCount, setMatchCount] = useState(0)
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Fetch match count when dialog opens
    if (open && user) {
      const fetchMatchCount = async () => {
        try {
          const { count } = await getMatchedLeads(user.id, 1, 1)
          setMatchCount(count || 0)
        } catch (error) {
          console.error("Error fetching match count:", error)
        }
      }

      fetchMatchCount()
    }
  }, [open, user])

  const handleSendMessage = () => {
    const url = lead.comment_author_url || lead.post_author_url
    if (url) {
      window.open(url, "_blank")
    }
    onClose()
  }

  const handleGenerateMessage = () => {
    setShowMessageGenerator(true)
  }

  const handleMessageSent = () => {
    setShowMessageGenerator(false)
    onClose()
  }

  const handleUnmatch = async () => {
    if (onUnmatch) {
      onUnmatch(lead.id)
      setIsRemoved(true)
    }
  }

  const handleViewAllMatches = () => {
    router.push("/leads")
    onClose()
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(isOpen) => {
          if (!isOpen) onClose()
        }}
      >
        <DialogContent className="sm:max-w-md md:max-w-lg border-border/30 bg-card shadow-lg shopify-card">
          {!isRemoved ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-center text-2xl text-blue-700 dark:text-blue-400">
                  It's a Match!
                </DialogTitle>
                <DialogDescription className="text-center">
                  You and{" "}
                  <span className={getTextDirectionClass(lead.name)}>
                    {lead.first_name && lead.last_name ? `${lead.first_name} ${lead.last_name}` : lead.name}
                  </span>{" "}
                  have matched!
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col items-center justify-center gap-6 py-6">
                <div className="flex items-center justify-center gap-4">
                  <div className="h-24 w-24 overflow-hidden rounded-full border-4 border-blue-600 p-1">
                    <img
                      src="/default-profile.png"
                      alt="Your profile"
                      className="h-full w-full rounded-full object-cover"
                    />
                  </div>
                  <div className="h-24 w-24 overflow-hidden rounded-full border-4 border-blue-600 p-1">
                    <img
                      src={lead.logo_url || "/placeholder.svg"}
                      alt={`${lead.name} logo`}
                      className="h-full w-full rounded-full object-cover"
                    />
                  </div>
                </div>
                <p className="text-center text-muted-foreground">
                  Start a conversation now or continue browsing leads.
                </p>
                {matchCount > 1 && (
                  <div className="text-center text-sm text-blue-600 dark:text-blue-400">
                    You have {matchCount} total matches!
                  </div>
                )}
              </div>
              <DialogFooter className="flex flex-col items-center w-full">
                <div className="flex flex-wrap justify-center gap-3 w-full max-w-sm mx-auto">
                  <Button
                    className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shopify-button"
                    onClick={handleSendMessage}
                  >
                    <MessageSquare className="h-4 w-4" />
                    Send Message
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleGenerateMessage}
                    className="gap-2 border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 shopify-button"
                  >
                    <Sparkles className="h-4 w-4" />
                    AI Message
                  </Button>
                  {matchCount > 1 && (
                    <Button
                      variant="outline"
                      onClick={handleViewAllMatches}
                      className="gap-2 border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 shopify-button"
                    >
                      <ArrowRight className="h-4 w-4" />
                      View All Matches
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    onClick={onClose}
                    className="border-border/50 bg-background hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-900/20 dark:hover:text-blue-400 shopify-button"
                  >
                    Keep Browsing
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={handleUnmatch}
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive shopify-button"
                  >
                    Remove Match
                  </Button>
                </div>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="text-center text-2xl text-green-600 dark:text-green-400">
                  Lead Removed
                </DialogTitle>
                <DialogDescription className="text-center">
                  The match with{" "}
                  <span className={getTextDirectionClass(lead.name)}>
                    {lead.first_name && lead.last_name ? `${lead.first_name} ${lead.last_name}` : lead.name}
                  </span>{" "}
                  has been successfully removed and archived.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col items-center justify-center gap-4 py-6">
                <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-8 w-8 text-green-600 dark:text-green-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-center text-muted-foreground">
                  You can find this lead in your archived leads section if you need to restore it later.
                </p>
              </div>
              <DialogFooter>
                <Button
                  onClick={onClose}
                  className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shopify-button mx-auto"
                >
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Message Generator Dialog */}
      {showMessageGenerator && (
        <MessageGeneratorDialog
          lead={lead}
          open={showMessageGenerator}
          onClose={() => setShowMessageGenerator(false)}
          onSend={handleMessageSent}
        />
      )}
    </>
  )
}
