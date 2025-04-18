"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { MessageSquare, Building2, Eye, Trash2, Users } from "lucide-react"
import { useState } from "react"
import { LeadDetailsDialog } from "@/components/lead-details-dialog"
import { getTextDirectionClass } from "@/lib/utils"
import { unmatchLead } from "@/services/lead-service"
import { useAuth } from "@/contexts/auth-context"
import type { Lead } from "@/services/lead-service"

interface LeadsListProps {
  leads: Lead[]
  open: boolean
  onClose: () => void
  onUnmatch?: (leadId: number) => void
}

export function LeadsList({ leads, open, onClose, onUnmatch }: LeadsListProps) {
  const { user } = useAuth()
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [showLeadDetails, setShowLeadDetails] = useState(false)
  const [localLeads, setLocalLeads] = useState<Lead[]>(leads)
  const [removingLeadId, setRemovingLeadId] = useState<number | null>(null)

  const handleSendMessage = (lead: Lead) => {
    const url = lead.comment_author_url || lead.post_author_url
    if (url) {
      window.open(url, "_blank")
    }
  }

  const handleViewLead = (lead: Lead) => {
    setSelectedLead(lead)
    setShowLeadDetails(true)
  }

  const handleRemoveMatch = async (leadId: number) => {
    if (!user) return

    setRemovingLeadId(leadId)

    try {
      await unmatchLead(user.id, leadId)

      // Update local state
      setLocalLeads(localLeads.filter((lead) => lead.id !== leadId))

      // Notify parent component if callback provided
      if (onUnmatch) {
        onUnmatch(leadId)
      }
    } catch (error) {
      console.error("Error removing match:", error)
    } finally {
      setRemovingLeadId(null)
    }
  }

  // Get Facebook profile image if available
  const getProfileImageUrl = (lead: Lead) => {
    if (lead.comment_author_id) {
      return `https://graph.facebook.com/${lead.comment_author_id}/picture?type=square`
    } else if (lead.post_author_id) {
      return `https://graph.facebook.com/${lead.post_author_id}/picture?type=square`
    }
    return lead.logo_url || "/placeholder.svg"
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md border-border/30 bg-card">
          <DialogHeader>
            <DialogTitle className="text-primary">Matched Leads</DialogTitle>
          </DialogHeader>
          {localLeads.length === 0 ? (
            <div className="py-8 text-center">
              <div className="flex flex-col items-center justify-center gap-4">
                <div className="rounded-full bg-blue-100 p-4 dark:bg-blue-900/30">
                  <Users className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-blue-700 dark:text-blue-400">No matched leads yet</h3>
                  <p className="text-muted-foreground">Start swiping to find potential matches!</p>
                  <p className="text-sm text-muted-foreground">We'll show you new leads when we find them.</p>
                </div>
              </div>
            </div>
          ) : (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {localLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className="flex items-center justify-between rounded-lg border border-border/30 bg-background p-3 hover:border-primary/30 transition-colors duration-300"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 overflow-hidden rounded-full bg-background p-1 border border-primary/30">
                        <img
                          src={getProfileImageUrl(lead) || "/placeholder.svg"}
                          alt={`${lead.name} profile`}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            // Fallback if Facebook image fails to load
                            ;(e.target as HTMLImageElement).src = lead.logo_url || "/placeholder.svg"
                          }}
                        />
                      </div>
                      <div>
                        <h3 className={`font-medium ${getTextDirectionClass(lead.name)}`}>
                          {lead.first_name && lead.last_name ? `${lead.first_name} ${lead.last_name}` : lead.name}
                        </h3>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Building2 className="h-3 w-3" />
                          <span className={getTextDirectionClass(lead.industry)}>
                            {lead.industry || "Facebook Lead"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 hover:bg-primary/20 hover:text-primary"
                        onClick={() => handleViewLead(lead)}
                      >
                        <Eye className="h-4 w-4" />
                        <span className="sr-only">View</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 hover:bg-primary/20 hover:text-primary"
                        onClick={() => handleSendMessage(lead)}
                      >
                        <MessageSquare className="h-4 w-4" />
                        <span className="sr-only">Message</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 hover:bg-destructive/20 hover:text-destructive"
                        onClick={() => handleRemoveMatch(lead.id)}
                        disabled={removingLeadId === lead.id}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Remove Match</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {selectedLead && (
        <LeadDetailsDialog lead={selectedLead} open={showLeadDetails} onClose={() => setShowLeadDetails(false)} />
      )}
    </>
  )
}
