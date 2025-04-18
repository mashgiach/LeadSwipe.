"use client"

import { useState, useEffect } from "react"
import { getArchivedLeads, restoreArchivedLead } from "@/services/lead-service"
import { SideNav } from "@/components/side-nav"
import ProtectedRoute from "@/app/protected-route"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { LeadDetailsDialog } from "@/components/lead-details-dialog"
import { useToast } from "@/components/ui/use-toast"
import { Search, RefreshCw, Archive, Info, ArrowLeft } from "lucide-react"
import type { Lead } from "@/types/lead"
import { truncateText } from "@/lib/utils"

export default function ArchivedLeadsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [processingLeadIds, setProcessingLeadIds] = useState<Record<number, boolean>>({})

  const fetchArchivedLeads = async () => {
    if (!user) return

    setLoading(true)
    setError(false)

    try {
      const result = await getArchivedLeads(user.id)
      setLeads(result.data || [])
    } catch (error) {
      console.error("Error fetching archived leads:", error)
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchArchivedLeads()
    }
  }, [user])

  const handleRefresh = () => {
    fetchArchivedLeads()
  }

  const handleUnarchive = async (leadId: number) => {
    if (!user) return

    setProcessingLeadIds((prev) => ({ ...prev, [leadId]: true }))

    try {
      await restoreArchivedLead(user.id, leadId)

      // Remove the lead from the list
      setLeads((prev) => prev.filter((lead) => lead.id !== leadId))

      toast({
        title: "Lead unarchived",
        description: "The lead has been removed from your archives.",
      })
    } catch (error) {
      console.error("Error unarchiving lead:", error)
      toast({
        title: "Error",
        description: "Failed to unarchive the lead. Please try again.",
        variant: "destructive",
      })
    } finally {
      setProcessingLeadIds((prev) => ({ ...prev, [leadId]: false }))
    }
  }

  const handleViewDetails = (lead: Lead) => {
    setSelectedLead(lead)
    setShowDetailsDialog(true)
  }

  const filteredLeads = leads.filter((lead) => {
    const searchContent = [
      lead.name,
      lead.first_name,
      lead.last_name,
      lead.email,
      lead.position,
      lead.location,
      lead.description,
      lead.industry,
      lead.post_text,
      lead.comment_text,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()

    return searchTerm === "" || searchContent.includes(searchTerm.toLowerCase())
  })

  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        <SideNav />
        <main className="flex-1 overflow-auto">
          <div className="flex flex-col h-full">
            <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Archived Leads</h1>
              </div>
              <div className="flex items-center space-x-2">
                <div className="relative w-64">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search archived leads..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>
            </div>

            <div className="p-4">
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[...Array(6)].map((_, i) => (
                    <Card key={i} className="overflow-hidden">
                      <CardContent className="p-0">
                        <Skeleton className="h-40 w-full" />
                        <div className="p-4 space-y-2">
                          <Skeleton className="h-5 w-3/4" />
                          <Skeleton className="h-4 w-1/2" />
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-full" />
                        </div>
                      </CardContent>
                      <CardFooter className="flex justify-between p-4 pt-0">
                        <Skeleton className="h-9 w-24" />
                        <Skeleton className="h-9 w-24" />
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <p className="text-lg text-muted-foreground mb-4">Failed to load archived leads</p>
                  <Button onClick={handleRefresh} className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Retry
                  </Button>
                </div>
              ) : filteredLeads.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <Archive className="h-16 w-16 text-muted-foreground mb-4" />
                  <p className="text-lg text-muted-foreground">
                    {searchTerm ? "No archived leads match your search" : "No archived leads found"}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredLeads.map((lead) => (
                    <Card key={lead.id} className="overflow-hidden">
                      <CardContent className="p-0">
                        <div className="h-40 bg-muted relative">
                          {lead.profile_image || lead.image_url ? (
                            <img
                              src={lead.profile_image || lead.image_url}
                              alt={lead.name || "Lead"}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900">
                              <span className="text-4xl font-bold text-gray-400">
                                {(lead.first_name?.[0] || lead.name?.[0] || "?").toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="p-4 space-y-2">
                          <h3 className="font-semibold text-lg">
                            {lead.first_name && lead.last_name
                              ? `${lead.first_name} ${lead.last_name}`
                              : lead.name || "Unknown"}
                          </h3>
                          <p className="text-sm text-muted-foreground">{lead.position || "No position"}</p>

                          {lead.description && (
                            <div className="text-sm">
                              <span className="font-medium">Description: </span>
                              {truncateText(lead.description, 100)}
                            </div>
                          )}

                          {lead.post_text && (
                            <div className="text-sm">
                              <span className="font-medium">Post: </span>
                              {truncateText(lead.post_text, 100)}
                            </div>
                          )}

                          {lead.comment_text && (
                            <div className="text-sm">
                              <span className="font-medium">Comment: </span>
                              {truncateText(lead.comment_text, 100)}
                            </div>
                          )}
                        </div>
                      </CardContent>
                      <CardFooter className="flex justify-between p-4 pt-0">
                        <Button variant="outline" size="sm" onClick={() => handleViewDetails(lead)}>
                          <Info className="h-4 w-4 mr-1" />
                          View Details
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleUnarchive(lead.id)}
                          disabled={processingLeadIds[lead.id]}
                        >
                          {processingLeadIds[lead.id] ? "Unarchiving..." : "Unarchive Lead"}
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {selectedLead && (
        <LeadDetailsDialog lead={selectedLead} open={showDetailsDialog} onOpenChange={setShowDetailsDialog} />
      )}
    </ProtectedRoute>
  )
}
