"use client"

import { useState, useEffect } from "react"
import { formatDistanceToNow } from "date-fns"
import { Ban, Building2, Undo } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { unblockLead, type BlockedLead } from "@/services/lead-service"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/contexts/toast-context"

interface BlockedLeadsListProps {
  blockedLeads: BlockedLead[]
  isLoading: boolean
  onUnblock: (leadId: number) => void
}

export function BlockedLeadsList({ blockedLeads, isLoading, onUnblock }: BlockedLeadsListProps) {
  const { user } = useAuth()
  const { addToast } = useToast()
  const [localBlockedLeads, setLocalBlockedLeads] = useState<BlockedLead[]>([])
  const [processingLeads, setProcessingLeads] = useState<number[]>([])

  // Update local state when props change
  useEffect(() => {
    setLocalBlockedLeads(blockedLeads)
  }, [blockedLeads])

  const handleUnblock = async (leadId: number) => {
    if (!user) return

    setProcessingLeads((prev) => [...prev, leadId])

    try {
      await unblockLead(user.id, leadId)
      setLocalBlockedLeads(localBlockedLeads.filter((item) => item.lead_id !== leadId))
      onUnblock(leadId)
      addToast({
        title: "Lead unblocked",
        description: "The lead has been successfully unblocked.",
        type: "success",
      })
    } catch (error) {
      console.error("Error unblocking lead:", error)
      addToast({
        title: "Error",
        description: "Failed to unblock the lead. Please try again.",
        type: "error",
      })
    } finally {
      setProcessingLeads((prev) => prev.filter((id) => id !== leadId))
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Card className="border-border/30 bg-card shadow-lg shopify-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 text-blue-700 dark:text-blue-400">
            <Ban className="h-5 w-5 text-destructive" />
            Blocked Leads
          </CardTitle>
        </CardHeader>
        <CardContent>
          {localBlockedLeads.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-muted-foreground">No blocked leads</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {localBlockedLeads.map((blockedLead) => {
                  const lead = blockedLead.lead
                  if (!lead) return null

                  const name =
                    lead.first_name && lead.last_name ? `${lead.first_name} ${lead.last_name}` : lead.name || "Unknown"

                  const isProcessing = processingLeads.includes(lead.id)

                  return (
                    <div
                      key={blockedLead.id}
                      className="flex items-center justify-between rounded-lg border border-border/30 bg-card p-3 shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 overflow-hidden rounded-full bg-background p-1 border border-destructive/30">
                          <img
                            src={lead.logo_url || "/placeholder.svg?height=48&width=48"}
                            alt={`${name} logo`}
                            className="h-full w-full object-contain"
                          />
                        </div>
                        <div>
                          <h3 className="font-medium">{name}</h3>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Building2 className="h-3 w-3" />
                              <span>{lead.industry || "Facebook Lead"}</span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Blocked {formatDistanceToNow(new Date(blockedLead.blocked_at), { addSuffix: true })}
                            </div>
                            {blockedLead.reason && (
                              <div className="text-xs text-destructive">Reason: {blockedLead.reason}</div>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 text-xs shopify-button"
                        onClick={() => handleUnblock(lead.id)}
                        disabled={isProcessing}
                      >
                        {isProcessing ? (
                          <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        ) : (
                          <Undo className="h-3 w-3" />
                        )}
                        {isProcessing ? "Unblocking..." : "Unblock"}
                      </Button>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
