"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import ProtectedRoute from "@/app/protected-route"
import { SideNav } from "@/components/side-nav"
import { LeadsTable } from "@/components/leads-table"
import { getMatchedLeads, type Lead, unmatchLead, archiveLead } from "@/services/lead-service"
import { Button } from "@/components/ui/button"
import { Archive, RefreshCw, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/contexts/toast-context"

export default function MatchedLeadsPage() {
  const { user } = useAuth()
  const { addToast } = useToast()
  const [leads, setLeads] = useState<Lead[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(false)
  const router = useRouter()
  const [processingLeadIds, setProcessingLeadIds] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const fetchMatchedLeads = async () => {
      if (!user) return

      setIsLoading(true)
      setError(false)
      try {
        const { data, count } = await getMatchedLeads(user.id, 1, 20)
        setLeads(data || [])
      } catch (err) {
        console.error("Error fetching matched leads:", err)
        setError(true)
      } finally {
        setIsLoading(false)
      }
    }

    fetchMatchedLeads()
  }, [user])

  const handleRefresh = async () => {
    if (!user) return

    setIsLoading(true)
    setError(false)
    try {
      const { data } = await getMatchedLeads(user.id, 1, 20)
      setLeads(data || [])
    } catch (err) {
      console.error("Error refreshing matched leads:", err)
      setError(true)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLeadRemoved = (leadId: number) => {
    if (leadId === -1) {
      // Special case for refresh
      handleRefresh()
      return
    }

    // Update local state immediately
    setLeads(leads.filter((lead) => lead.id !== leadId))
  }

  const handleViewArchivedLeads = () => {
    router.push("/leads/archived")
  }

  const handleUnmatch = async (leadId: number) => {
    if (!user) return

    // Set processing state
    setProcessingLeadIds((prev) => ({ ...prev, [`unmatch-${leadId}`]: true }))

    try {
      await unmatchLead(user.id, leadId)

      // Update local state immediately
      setLeads((prev) => prev.filter((lead) => lead.id !== leadId))

      addToast({
        title: "Lead unmatched",
        description: "The lead has been removed from your matches.",
        type: "success",
      })
    } catch (error) {
      console.error("Error unmatching lead:", error)
      addToast({
        title: "Error",
        description: "Failed to unmatch the lead. Please try again.",
        type: "error",
      })
    } finally {
      setProcessingLeadIds((prev) => ({ ...prev, [`unmatch-${leadId}`]: false }))
    }
  }

  const handleArchive = async (leadId: number) => {
    if (!user) return

    // Set processing state
    setProcessingLeadIds((prev) => ({ ...prev, [`archive-${leadId}`]: true }))

    try {
      // First archive the lead
      await archiveLead(user.id, leadId)

      // Then unmatch it
      await unmatchLead(user.id, leadId)

      // Update local state immediately
      setLeads((prev) => prev.filter((lead) => lead.id !== leadId))

      addToast({
        title: "Lead archived",
        description: "The lead has been moved to your archives.",
        type: "success",
      })
    } catch (error) {
      console.error("Error archiving lead:", error)
      addToast({
        title: "Error",
        description: "Failed to archive the lead. Please try again.",
        type: "error",
      })
    } finally {
      setProcessingLeadIds((prev) => ({ ...prev, [`archive-${leadId}`]: false }))
    }
  }

  // Custom actions for the leads table
  const customActions = (lead: Lead) => (
    <div className="flex space-x-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleArchive(lead.id)}
        disabled={processingLeadIds[`archive-${lead.id}`]}
      >
        <Archive className="h-4 w-4 mr-1" />
        {processingLeadIds[`archive-${lead.id}`] ? "Archiving..." : "Archive"}
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={() => handleUnmatch(lead.id)}
        disabled={processingLeadIds[`unmatch-${lead.id}`]}
      >
        <X className="h-4 w-4 mr-1" />
        {processingLeadIds[`unmatch-${lead.id}`] ? "Unmatching..." : "Unmatch"}
      </Button>
    </div>
  )

  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        <SideNav />
        <main className="flex-1 overflow-auto">
          <div className="flex flex-col h-full">
            <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 flex items-center justify-between">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Matched Leads</h1>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" onClick={handleViewArchivedLeads}>
                  <Archive className="h-4 w-4 mr-2" />
                  See Archived
                </Button>
                <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
                  <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </div>

            <div className="p-4">
              <LeadsTable
                leads={leads}
                isLoading={isLoading}
                isMatchedOnly={true}
                onLeadRemoved={handleLeadRemoved}
                pageTitle=""
                error={error}
                onRefresh={handleRefresh}
                customActions={customActions}
              />
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
