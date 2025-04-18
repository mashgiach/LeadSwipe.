"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Building2, Star, Trash2, MessageSquare, Eye } from "lucide-react"
import { useState } from "react"
import { LeadDetailsDialog } from "@/components/lead-details-dialog"
import { getTextDirectionClass } from "@/lib/utils"
import { unsaveLead } from "@/services/lead-service"
import { useAuth } from "@/contexts/auth-context"
import type { Lead } from "@/services/lead-service"

interface SavedLeadsListProps {
  leads: Lead[]
  open: boolean
  onClose: () => void
  onUnsave?: (leadId: number) => void
}

export function SavedLeadsList({ leads, open, onClose, onUnsave }: SavedLeadsListProps) {
  const { user } = useAuth()
  const [localLeads, setLocalLeads] = useState(leads)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [showLeadDetails, setShowLeadDetails] = useState(false)
  const [removingLeadId, setRemovingLeadId] = useState<number | null>(null)

  const handleRemove = async (id: number) => {
    if (!user) return

    setRemovingLeadId(id)

    try {
      await unsaveLead(user.id, id)
      setLocalLeads(localLeads.filter((lead) => lead.id !== id))

      if (onUnsave) {
        onUnsave(id)
      }
    } catch (error) {
      console.error("Error unsaving lead:", error)
    } finally {
      setRemovingLeadId(null)
    }
  }

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
            <DialogTitle className="text-primary">Saved Leads</DialogTitle>
          </DialogHeader>
          {localLeads.length === 0 ? (
            <div className="py-8 text-center">
              <div className="flex flex-col items-center justify-center gap-4">
                <div className="rounded-full bg-amber-100 p-4 dark:bg-amber-900/30">
                  <Star className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-blue-700 dark:text-blue-400">No saved leads yet</h3>
                  <p className="text-muted-foreground">Star leads you're interested in to save them for later!</p>
                  <p className="text-sm text-muted-foreground">We'll show them here when you save them.</p>
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
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-amber-400">
                        <Star className="h-4 w-4 fill-current" />
                        <span className="sr-only">Saved</span>
                      </Button>
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
                        className="h-8 w-8 p-0 text-destructive hover:bg-destructive/20"
                        onClick={() => handleRemove(lead.id)}
                        disabled={removingLeadId === lead.id}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Remove</span>
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
