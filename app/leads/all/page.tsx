"use client"

import { useState, useEffect } from "react"
import { getLeads } from "@/services/lead-service"
import { LeadsTable } from "@/components/leads-table"
import { PaginationControls } from "@/components/pagination-controls"
import { Skeleton } from "@/components/ui/skeleton"
import { SideNav } from "@/components/side-nav"
import ProtectedRoute from "@/app/protected-route"
import type { Lead } from "@/types/lead"
import { Button } from "@/components/ui/button"
import { RefreshCw, Star, Heart } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { saveLead, matchLead, getSavedLeadIds, getMatchedLeadIds } from "@/services/lead-service"
import { useToast } from "@/components/ui/use-toast"

export default function AllLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalPages, setTotalPages] = useState(0)
  const [totalItems, setTotalItems] = useState(0)
  const [error, setError] = useState(false)
  const [savedLeadIds, setSavedLeadIds] = useState<number[]>([])
  const [matchedLeadIds, setMatchedLeadIds] = useState<number[]>([])
  const [processingLeadIds, setProcessingLeadIds] = useState<Record<string, boolean>>({})
  const { user } = useAuth()
  const { toast } = useToast()

  const fetchLeads = async (page: number, size: number) => {
    setLoading(true)
    setError(false)

    try {
      const { leads, count, totalPages } = await getLeads(page, size)
      setLeads(leads || [])
      setTotalItems(count)
      setTotalPages(totalPages)
    } catch (error) {
      console.error("Error fetching leads:", error)
      setLeads([])
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  const fetchSavedAndMatchedLeads = async () => {
    if (!user) return

    try {
      const savedIds = await getSavedLeadIds(user.id)
      const matchedIds = await getMatchedLeadIds(user.id)

      setSavedLeadIds(savedIds)
      setMatchedLeadIds(matchedIds)
    } catch (error) {
      console.error("Error fetching saved/matched leads:", error)
    }
  }

  useEffect(() => {
    fetchLeads(currentPage, pageSize)
    if (user) {
      fetchSavedAndMatchedLeads()
    }
  }, [currentPage, pageSize, user])

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handlePageSizeChange = (size: number) => {
    setPageSize(size)
    setCurrentPage(1) // Reset to first page when changing page size
  }

  const handleRefresh = () => {
    fetchLeads(currentPage, pageSize)
    if (user) {
      fetchSavedAndMatchedLeads()
    }
  }

  const handleSaveLead = async (leadId: number) => {
    if (!user) return

    // Set processing state
    setProcessingLeadIds((prev) => ({ ...prev, [`save-${leadId}`]: true }))

    try {
      await saveLead(user.id, leadId)

      // Update local state
      setSavedLeadIds((prev) => {
        if (prev.includes(leadId)) {
          return prev
        }
        return [...prev, leadId]
      })

      toast({
        title: "Lead saved",
        description: "The lead has been added to your saved leads.",
      })
    } catch (error) {
      console.error("Error saving lead:", error)
      toast({
        title: "Error",
        description: "Failed to save the lead. Please try again.",
        variant: "destructive",
      })
    } finally {
      setProcessingLeadIds((prev) => ({ ...prev, [`save-${leadId}`]: false }))
    }
  }

  const handleMatchLead = async (leadId: number) => {
    if (!user) return

    // Set processing state
    setProcessingLeadIds((prev) => ({ ...prev, [`match-${leadId}`]: true }))

    try {
      await matchLead(user.id, leadId)

      // Update local state
      setMatchedLeadIds((prev) => {
        if (prev.includes(leadId)) {
          return prev
        }
        return [...prev, leadId]
      })

      toast({
        title: "Lead matched",
        description: "You've matched with this lead!",
      })
    } catch (error) {
      console.error("Error matching lead:", error)
      toast({
        title: "Error",
        description: "Failed to match with the lead. Please try again.",
        variant: "destructive",
      })
    } finally {
      setProcessingLeadIds((prev) => ({ ...prev, [`match-${leadId}`]: false }))
    }
  }

  // Custom actions for the leads table
  const customActions = (lead: Lead) => (
    <div className="flex space-x-2">
      <Button
        variant="outline"
        size="sm"
        className={savedLeadIds.includes(lead.id) ? "text-yellow-500" : ""}
        onClick={() => handleSaveLead(lead.id)}
        disabled={processingLeadIds[`save-${lead.id}`] || savedLeadIds.includes(lead.id)}
      >
        <Star className="h-4 w-4 mr-1" />
        {savedLeadIds.includes(lead.id) ? "Saved" : "Save"}
      </Button>

      <Button
        variant="outline"
        size="sm"
        className={matchedLeadIds.includes(lead.id) ? "text-pink-500" : ""}
        onClick={() => handleMatchLead(lead.id)}
        disabled={processingLeadIds[`match-${lead.id}`] || matchedLeadIds.includes(lead.id)}
      >
        <Heart className="h-4 w-4 mr-1" />
        {matchedLeadIds.includes(lead.id) ? "Matched" : "Match"}
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
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">All Leads</h1>
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                <span className="ml-2">Refresh</span>
              </Button>
            </div>

            <div className="p-4">
              {loading ? (
                <div className="space-y-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-[400px] w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <p className="text-lg text-muted-foreground mb-4">Failed to load leads</p>
                  <Button onClick={handleRefresh} className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                  </Button>
                </div>
              ) : (
                <>
                  <LeadsTable leads={leads} pageTitle="" customActions={customActions} />

                  <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalPages}
                    pageSize={pageSize}
                    onPageChange={handlePageChange}
                    onPageSizeChange={handlePageSizeChange}
                    totalItems={totalItems}
                  />
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
