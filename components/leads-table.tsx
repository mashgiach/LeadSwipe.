"use client"

import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { DropdownMenuContent } from "@/components/ui/dropdown-menu"
import { DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { DropdownMenu, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import type React from "react"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Ban,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  MessageSquare,
  Search,
  Settings,
  Tag,
  Loader2,
  RefreshCw,
  Info,
} from "lucide-react"
import { MessageGeneratorDialog } from "@/components/message-generator-dialog"
import { Badge } from "@/components/ui/badge"
import { KeywordFilterDialog } from "@/components/keyword-filter-dialog"
import { LeadDetailsDialog } from "@/components/lead-details-dialog"
import { getTextDirectionClass, truncateText } from "@/lib/utils"
import { useAuth } from "@/contexts/auth-context"
import {
  unmatchLead,
  archiveLead,
  type Lead,
  restoreArchivedLead,
  matchLead,
  getLeads,
  getMatchedLeads,
} from "@/services/lead-service"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/contexts/toast-context"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface LeadsTableProps {
  leads?: Lead[]
  isLoading?: boolean
  isMatchedOnly?: boolean
  onLeadRemoved?: (leadId: number) => void
  pageTitle?: string
  error?: boolean
  onRefresh?: () => void
  customActions?: (lead: Lead) => React.ReactNode
}

type SortField = keyof Lead | null
type SortDirection = "asc" | "desc"

interface LeadCardActionsProps {
  lead: Lead
  onViewDetails: (lead: Lead) => void
  onMessageClick: (lead: Lead) => void
  onHandleRemoveClick: (lead: Lead) => void
}

function LeadCardActions({ lead, onViewDetails, onMessageClick, onHandleRemoveClick }: LeadCardActionsProps) {
  return (
    <div className="flex justify-end gap-2">
      <Button variant="ghost" size="icon" onClick={() => onViewDetails(lead)} className="h-8 w-8" title="View Lead">
        <Eye className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onMessageClick(lead)}
        className="h-8 w-8"
        title="Generate Message"
      >
        <MessageSquare className="h-4 w-4" />
      </Button>
      {/* Add archive button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={(e) => {
          e.stopPropagation()
          onHandleRemoveClick(lead)
        }}
        className="h-8 w-8 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
        title="Archive Lead"
      >
        <Ban className="h-4 w-4" />
      </Button>
    </div>
  )
}

interface LeadStatusBadgeProps {
  status: string
}

function LeadStatusBadge({ status }: LeadStatusBadgeProps) {
  let badgeText = ""
  let badgeColor = "bg-muted" // Default color

  switch (status) {
    case "new":
      badgeText = "New"
      badgeColor = "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      break
    case "in_progress":
      badgeText = "In Progress"
      badgeColor = "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
      break
    case "converted":
      badgeText = "Converted"
      badgeColor = "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
      break
    case "rejected":
      badgeText = "Rejected"
      badgeColor = "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
      break
    default:
      badgeText = "Unknown"
  }

  return <Badge className={`rounded-full px-2 py-0.5 text-xs font-medium ${badgeColor}`}>{badgeText}</Badge>
}

export function LeadsTable({
  leads: initialLeads,
  isLoading: initialLoading,
  isMatchedOnly = false,
  onLeadRemoved,
  pageTitle,
  error = false,
  onRefresh,
  customActions,
}: LeadsTableProps) {
  const router = useRouter()
  const { user } = useAuth()
  const { addToast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  // Make global search the default
  const [isGlobalSearch, setIsGlobalSearch] = useState(true)
  const [sortField, setSortField] = useState<SortField>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [showMessageGenerator, setShowMessageGenerator] = useState(false)
  const [showKeywordFilter, setShowKeywordFilter] = useState(false)
  const [showLeadDetails, setShowLeadDetails] = useState(false)
  const [keywords, setKeywords] = useState<string[]>([])
  const [showRemoveDialog, setShowRemoveDialog] = useState(false)
  const [leadToRemove, setLeadToRemove] = useState<Lead | null>(null)
  const [isRemoving, setIsRemoving] = useState(false)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [exportOption, setExportOption] = useState<"all" | "page" | "selected">("page")
  const [isExporting, setIsExporting] = useState(false)
  const [selectedLeads, setSelectedLeads] = useState<Record<number, boolean>>({})
  const [selectAll, setSelectAll] = useState(false)
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [availableGroups, setAvailableGroups] = useState<{ group_id: string; group_name: string }[]>([])

  // Server-side pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [isLoading, setIsLoading] = useState(initialLoading || true)
  const [leads, setLeads] = useState<Lead[]>(initialLeads || [])
  const [itemsPerPage, setItemsPerPage] = useState(20)
  const [loadingTimeout, setLoadingTimeout] = useState<NodeJS.Timeout | null>(null)
  const [showNoResults, setShowNoResults] = useState(false)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)

  const handleRemoveClick = (lead: Lead) => {
    setLeadToRemove(lead)
    setShowRemoveDialog(true)
  }

  // Fetch leads with server-side pagination
  const fetchLeads = async (
    page = currentPage,
    pageSize = itemsPerPage,
    groupId = selectedGroupId,
    searchQuery = searchTerm,
  ) => {
    if (!user) return

    setIsLoading(true)
    setShowNoResults(false)

    // Set a timeout to show "No results" message if loading takes too long
    if (loadingTimeout) {
      clearTimeout(loadingTimeout)
    }

    const timeout = setTimeout(() => {
      if (isLoading) {
        setShowNoResults(true)
      }
    }, 10000) // 10 seconds timeout

    setLoadingTimeout(timeout)

    try {
      if (isMatchedOnly) {
        // Fetch matched leads with pagination
        const { data, count } = await getMatchedLeads(
          user.id,
          page,
          pageSize,
          groupId,
          searchQuery, // Always use search query since global search is default
        )
        setLeads(data || []) // Ensure we always set an array
        setTotalItems(count || 0)
      } else {
        // Fetch all leads with pagination
        const { leads: fetchedLeads, count } = await getLeads(
          page,
          pageSize,
          groupId,
          searchQuery, // Always use search query since global search is default
        )
        setLeads(fetchedLeads || []) // Ensure we always set an array
        setTotalItems(count || 0)
      }
    } catch (error) {
      console.error("Error fetching leads:", error)
      addToast({
        title: "Error",
        description: "Failed to fetch leads. Please try again.",
        type: "error",
      })
      setShowNoResults(true)
      setLeads([]) // Set empty array on error
    } finally {
      setIsLoading(false)
      if (loadingTimeout) {
        clearTimeout(loadingTimeout)
      }
    }
  }

  const fetchGroups = async () => {
    if (!user) return

    try {
      const supabase = getSupabaseBrowserClient()
      const { data, error } = await supabase.from("facebook_groups").select("group_id, group_name").order("group_name")

      if (error) {
        console.error("Error fetching groups:", error)
        return
      }

      setAvailableGroups(data || [])
    } catch (error) {
      console.error("Unexpected error fetching groups:", error)
    }
  }

  // Initial fetch and when page changes
  useEffect(() => {
    // If leads are provided as props, use them
    if (initialLeads && initialLeads.length > 0 && !isLoading) {
      setLeads(initialLeads)
      setIsLoading(false)
    } else {
      fetchLeads(currentPage, itemsPerPage, selectedGroupId, searchTerm)
    }

    return () => {
      if (loadingTimeout) {
        clearTimeout(loadingTimeout)
      }
    }
  }, [currentPage, itemsPerPage, isMatchedOnly, selectedGroupId])

  // Add this after the existing useEffect for fetching leads
  useEffect(() => {
    fetchGroups()
  }, [user])

  // Reset selection when leads change
  useEffect(() => {
    setSelectedLeads({})
    setSelectAll(false)
  }, [leads])

  // Reset to first page when items per page changes
  useEffect(() => {
    setCurrentPage(1)
  }, [itemsPerPage])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  // Handle search
  const handleSearch = () => {
    setCurrentPage(1) // Reset to first page for search
    fetchLeads(1, itemsPerPage, selectedGroupId, searchTerm)
  }

  // Apply client-side filtering for keywords
  const filteredLeads = useMemo(() => {
    if (!leads || leads.length === 0) return []

    let filtered = [...leads]

    // Apply keyword filtering if keywords are set
    if (keywords && keywords.length > 0) {
      filtered = filtered.filter((lead) => {
        // Create a combined text from all lead fields to search in
        const leadText = [
          lead.name || "",
          lead.first_name || "",
          lead.last_name || "",
          lead.email || "",
          lead.comment_text || "",
          lead.post_text || "",
          lead.description || "",
          lead.industry || "",
          ...(lead.tags || []),
          ...(lead.keywords || []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()

        // Check if any keyword is found in the lead text
        return keywords.some((keyword) => leadText.includes(keyword.toLowerCase()))
      })
    }

    return filtered
  }, [leads, keywords])

  const sortedLeads = useMemo(() => {
    if (!filteredLeads || filteredLeads.length === 0) return []
    if (!sortField) return filteredLeads

    return [...filteredLeads].sort((a, b) => {
      const aValue = a[sortField]
      const bValue = b[sortField]

      if (aValue === null || aValue === undefined) return sortDirection === "asc" ? -1 : 1
      if (bValue === null || bValue === undefined) return sortDirection === "asc" ? 1 : -1

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue)
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1
      return 0
    })
  }, [filteredLeads, sortField, sortDirection])

  // Calculate pagination
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1
  const paginatedLeads = sortedLeads || []

  const handleSelectAllChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectAll(event.target.checked)
    const newSelectedLeads: Record<number, boolean> = {}
    if (event.target.checked && sortedLeads) {
      sortedLeads.forEach((lead) => {
        newSelectedLeads[lead.id] = true
      })
    }
    setSelectedLeads(newSelectedLeads)
  }

  const handleSelectLeadChange = (leadId: number, checked: boolean) => {
    setSelectedLeads((prevSelectedLeads) => ({
      ...prevSelectedLeads,
      [leadId]: checked,
    }))

    // Update "select all" checkbox state
    if (!checked && selectAll) {
      setSelectAll(false)
    } else if (checked && sortedLeads && Object.keys(selectedLeads).length === sortedLeads.length - 1) {
      setSelectAll(true)
    }
  }

  const handleSelectLead = (leadId: number, isSelected: boolean) => {
    setSelectedLeads((prev) => ({
      ...prev,
      [leadId]: isSelected,
    }))
  }

  // Add this function to handle select all
  const handleSelectAll = (isSelected: boolean) => {
    setSelectAll(isSelected)

    if (isSelected && paginatedLeads) {
      const newSelected: Record<number, boolean> = {}
      paginatedLeads.forEach((lead) => {
        newSelected[lead.id] = true
      })
      setSelectedLeads(newSelected)
    } else {
      setSelectedLeads({})
    }
  }

  const exportToCSV = (exportType: "all" | "page" | "selected") => {
    if (!sortedLeads || sortedLeads.length === 0) return

    // Create CSV content
    const headers = [
      "ID",
      "Name",
      "Email",
      "Post Text",
      "Comment Text",
      "Post Author",
      "Comment Author",
      "Timestamp",
      "URL",
    ]

    let leadsToExport: Lead[] = []

    switch (exportType) {
      case "all":
        leadsToExport = sortedLeads
        break
      case "page":
        leadsToExport = paginatedLeads
        break
      case "selected":
        leadsToExport = paginatedLeads.filter((lead) => selectedLeads[lead.id])
        break
    }

    const csvContent = [
      headers.join(","),
      ...leadsToExport.map((lead) => {
        const name = lead.first_name && lead.last_name ? `${lead.first_name} ${lead.last_name}` : lead.name || ""

        return [
          lead.id,
          `"${name.replace(/"/g, '""')}"`,
          lead.email || "",
          `"${(lead.post_text || "").replace(/"/g, '""')}"`,
          `"${(lead.comment_text || "").replace(/"/g, '""')}"`,
          `"${(lead.post_author || "").replace(/"/g, '""')}"`,
          `"${(lead.comment_author_name || "").replace(/"/g, '""')}"`,
          lead.timestamp ? new Date(lead.timestamp).toISOString() : "",
          lead.comment_url || lead.post_author_url || "",
        ].join(",")
      }),
    ].join("\n")

    // Create and download the CSV file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `leads-export-${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleMessageClick = (lead: Lead) => {
    setSelectedLead(lead)
    setShowMessageGenerator(true)
  }

  const handleViewLead = (lead: Lead) => {
    setSelectedLead(lead)
    setShowLeadDetails(true)
  }

  const handleSendMessage = (lead: Lead) => {
    // Open the author URL in a new tab
    const url = lead.comment_author_url || lead.post_author_url
    if (url) {
      window.open(url, "_blank")
    }
  }

  const handleKeywordsChange = (newKeywords: string[]) => {
    setKeywords(newKeywords)
    // Apply keyword filtering immediately
    setCurrentPage(1) // Reset to first page when filter changes
  }

  const handleRemoveConfirm = async () => {
    if (!user || !leadToRemove) return

    try {
      setIsRemoving(true)

      // Store the lead for potential undo
      const leadToRestore = leadToRemove

      // First archive the lead
      await archiveLead(user.id, leadToRemove.id)

      // Then unmatch it if it's a matched lead
      if (isMatchedOnly) {
        await unmatchLead(user.id, leadToRemove.id)
      }

      // Update local state immediately
      setLeads((prevLeads) => prevLeads.filter((lead) => lead.id !== leadToRemove.id))

      // Notify parent component if callback provided
      if (onLeadRemoved) {
        onLeadRemoved(leadToRemove.id)
      }

      // Show success notification with undo button
      const name =
        leadToRestore.first_name && leadToRestore.last_name
          ? `${leadToRestore.first_name} ${leadToRestore.last_name}`
          : leadToRestore.name || "Lead"

      addToast({
        title: "Lead archived successfully",
        description: `${name} has been removed from your matches.`,
        type: "success",
        action: {
          label: "Undo",
          onClick: async () => {
            try {
              // Restore the lead from archive
              await restoreArchivedLead(user.id, leadToRestore.id)

              // If it was a matched lead, re-match it
              if (isMatchedOnly) {
                await matchLead(user.id, leadToRestore.id)
              }

              // Add the lead back to the local state
              setLeads((prev) => [leadToRestore, ...prev])

              // Notify parent if needed
              if (onLeadRemoved) {
                // This is a bit of a hack - we're using the removal callback to notify
                // the parent that the lead has been restored
                onLeadRemoved(-1) // Using -1 as a signal to refresh
              }

              addToast({
                title: "Lead restored",
                description: `${name} has been added back to your matches.`,
                type: "info",
                duration: 3000,
              })
            } catch (error) {
              console.error("Error restoring lead:", error)
              addToast({
                title: "Error",
                description: "Failed to restore the lead. Please try again.",
                type: "error",
              })
            }
          },
        },
      })
    } catch (error) {
      console.error("Error removing lead:", error)
      addToast({
        title: "Error",
        description: "Failed to archive the lead. Please try again.",
        type: "error",
      })
    } finally {
      // Close the dialog and reset state
      setShowRemoveDialog(false)
      setLeadToRemove(null)
      // Set isRemoving to false after a short delay to ensure dialog is closed first
      setTimeout(() => {
        setIsRemoving(false)
      }, 100)
    }
  }

  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh()
    } else {
      fetchLeads(currentPage, itemsPerPage, selectedGroupId, searchTerm)
    }
  }

  // Function to truncate text with a "Read more" option
  // Add this function inside the component
  const renderMobileCards = () => {
    if (!leads || leads.length === 0) return null

    return (
      <div className="grid gap-4 sm:hidden">
        {paginatedLeads.map((lead) => (
          <div key={lead.id} className="rounded-lg border bg-white dark:bg-gray-800 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 overflow-hidden rounded-full">
                  <img
                    src={lead.profile_picture || "/default-profile.png"}
                    alt={lead.name || "Lead"}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="font-medium">{lead.name || "Unknown"}</h3>
                  <p className="text-sm text-muted-foreground">Facebook</p>
                </div>
              </div>
              <LeadStatusBadge status={lead.status || "new"} />
            </div>

            {/* Post content */}
            {(lead.post_text || lead.comment_text) && (
              <div className="mt-3 text-sm">{renderTruncatedText(lead.post_text || lead.comment_text, 100)}</div>
            )}

            {/* Post ID */}
            {lead.post_id && (
              <div className="mt-2 text-xs text-muted-foreground">Post ID: {lead.post_id.substring(0, 10)}...</div>
            )}

            <div className="mt-3 flex justify-end">
              <LeadCardActions
                lead={lead}
                onViewDetails={handleViewLead}
                onMessageClick={handleMessageClick}
                onHandleRemoveClick={handleRemoveClick}
              />
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Handle page change with data fetching
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    fetchLeads(page, itemsPerPage, selectedGroupId, searchTerm)
  }

  // Handle page size change
  const handlePageSizeChange = (size: number) => {
    setItemsPerPage(size)
    setCurrentPage(1) // Reset to first page
    fetchLeads(1, size, selectedGroupId, searchTerm)
  }

  // Handle group filter change
  const handleGroupFilterChange = (value: string) => {
    const newGroupId = value === "all" ? null : value
    setSelectedGroupId(newGroupId)
    setCurrentPage(1) // Reset to first page
    fetchLeads(1, itemsPerPage, newGroupId, searchTerm)
  }

  const handleViewDetails = (lead: Lead) => {
    setSelectedLead(lead)
    setShowDetailsDialog(true)
  }

  const searchContent = (lead: Lead) => {
    return [
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
  }

  const filterLeads = (leads: Lead[]) => {
    return leads.filter((lead) => {
      // If no search term, return all leads
      if (searchTerm === "") return true

      // Otherwise, check if the search term is in any of the lead's content
      return searchContent(lead).includes(searchTerm.toLowerCase())
    })
  }

  // Find the existing truncateText function and replace it with this:
  const renderTruncatedText = (text: string | undefined, maxLength: number) => {
    if (!text) return ""

    const truncated = truncateText(text, maxLength)

    if (text.length <= maxLength) return truncated

    return (
      <span>
        {truncated}
        <button
          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 ml-1 text-xs font-medium"
          onClick={(e) => {
            e.stopPropagation()
            // Show full text in the lead details dialog
            const leadToView = leads.find((l) => l.post_text === text || l.comment_text === text)
            if (leadToView) {
              setSelectedLead(leadToView)
              setShowLeadDetails(true)
            }
          }}
        >
          Read more
        </button>
      </span>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border/30 bg-card p-4">
        <h1 className="text-2xl font-bold text-blue-700 dark:text-blue-400 mb-3 sm:mb-0">
          {pageTitle || (isMatchedOnly ? "Matched Leads" : "All Facebook Leads")}
        </h1>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => router.push("/leads/blocked")}
            className="border-border/50 bg-background hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-900/20 dark:hover:text-blue-400 shopify-button"
          >
            <Ban className="mr-2 h-4 w-4" />
            Blocked Leads
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push("/settings")}
            className="border-border/50 bg-background hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-900/20 dark:hover:text-blue-400 shopify-button"
          >
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shopify-button">
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => exportToCSV("all")}>Export All Leads</DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportToCSV("page")}>Export Current Page</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => exportToCSV("selected")}
                disabled={Object.keys(selectedLeads).length === 0}
              >
                Export Selected Leads
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="p-4 shopify-gradient">
        <div className="flex flex-col sm:flex-row items-center mb-4 gap-2">
          <div className="relative flex-1 w-full">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSearch()
                }
              }}
              className="pr-10 shopify-input"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={handleSearch}
              className="border-border/50 bg-background hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-900/20 dark:hover:text-blue-400 shopify-button"
            >
              Search
            </Button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center mb-4 gap-2">
          <Select value={selectedGroupId || "all"} onValueChange={handleGroupFilterChange}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by group" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Groups</SelectItem>
              {availableGroups.map((group) => (
                <SelectItem key={group.group_id} value={group.group_id}>
                  {group.group_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={() => setShowKeywordFilter(true)}
            className="w-full sm:w-auto border-border/50 bg-background hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-900/20 dark:hover:text-blue-400 shopify-button"
          >
            <Tag className="mr-2 h-4 w-4" />
            Keywords {keywords && keywords.length > 0 ? `(${keywords.length})` : ""}
          </Button>
        </div>

        {selectedGroupId && (
          <div className="flex items-center mb-4">
            <Badge
              variant="secondary"
              className="bg-blue-100 text-blue-700 border border-blue-300 dark:bg-blue-900/40 dark:text-blue-400 dark:border-blue-800/50"
            >
              Group: {availableGroups.find((g) => g.group_id === selectedGroupId)?.group_name || selectedGroupId}
              <button
                className="ml-1 text-blue-700 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                onClick={() => handleGroupFilterChange("all")}
              >
                ×
              </button>
            </Badge>
          </div>
        )}

        {keywords && keywords.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {keywords.map((keyword, index) => (
              <Badge
                key={index}
                variant="secondary"
                className={`bg-blue-100 text-blue-700 border border-blue-300 dark:bg-blue-900/40 dark:text-blue-400 dark:border-blue-800/50 ${getTextDirectionClass(keyword)}`}
              >
                {keyword}
                <button
                  className="ml-1 text-blue-700 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                  onClick={() => {
                    const newKeywords = [...keywords]
                    newKeywords.splice(index, 1)
                    setKeywords(newKeywords)
                  }}
                >
                  ×
                </button>
              </Badge>
            ))}
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setKeywords([])}>
              Clear all
            </Button>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-2 text-lg">Loading leads...</span>
          </div>
        ) : paginatedLeads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-lg text-muted-foreground mb-4">No leads found</p>
            <Button onClick={handleRefresh} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        ) : (
          <>
            {renderMobileCards()}
            <div className="hidden overflow-x-auto rounded-md border sm:block bg-white dark:bg-gray-800">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead className="hidden md:table-cell">Location</TableHead>
                    <TableHead className="hidden lg:table-cell">Description</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filterLeads(paginatedLeads).map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell className="font-medium">
                        {lead.first_name && lead.last_name
                          ? `${lead.first_name} ${lead.last_name}`
                          : lead.name || "Unknown"}
                      </TableCell>
                      <TableCell>{lead.position || "N/A"}</TableCell>
                      <TableCell className="hidden md:table-cell">{lead.location || "N/A"}</TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {lead.description ? renderTruncatedText(lead.description, 100) : "N/A"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button variant="outline" size="sm" onClick={() => handleViewDetails(lead)}>
                            <Info className="h-4 w-4 mr-1" />
                            Details
                          </Button>
                          {customActions && customActions(lead)}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Show</span>
                  <Select
                    value={itemsPerPage.toString()}
                    onValueChange={(value) => handlePageSizeChange(Number.parseInt(value))}
                  >
                    <SelectTrigger className="w-[80px]">
                      <SelectValue placeholder={itemsPerPage.toString()} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="30">30</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-muted-foreground">per page</span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="text-sm">
                    Page {currentPage} of {totalPages}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                <div className="text-sm text-muted-foreground">
                  Showing {Math.min(totalItems, (currentPage - 1) * itemsPerPage + 1)} to{" "}
                  {Math.min(totalItems, currentPage * itemsPerPage)} of {totalItems} entries
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {selectedLead && (
        <MessageGeneratorDialog
          lead={selectedLead}
          open={showMessageGenerator}
          onClose={() => setShowMessageGenerator(false)}
          onSend={() => handleSendMessage(selectedLead)}
        />
      )}

      {selectedLead && (
        <LeadDetailsDialog
          lead={selectedLead}
          open={showLeadDetails}
          onOpenChange={(open) => setShowLeadDetails(open)}
        />
      )}

      <KeywordFilterDialog
        open={showKeywordFilter}
        onClose={() => setShowKeywordFilter(false)}
        keywords={keywords}
        onKeywordsChange={handleKeywordsChange}
      />

      {/* Confirmation Dialog for Removing Matched Lead */}
      {showRemoveDialog && leadToRemove && (
        <AlertDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) {
              setShowRemoveDialog(false)
              setLeadToRemove(null)
            }
          }}
        >
          <AlertDialogContent className="border-border/30 bg-white dark:bg-gray-900">
            <AlertDialogHeader>
              <AlertDialogTitle>Archive and Remove Match</AlertDialogTitle>
              <AlertDialogDescription>
                This lead will be removed from your matches and moved to archived leads. You can restore it later from
                the archived leads section.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowRemoveDialog(false)
                  setLeadToRemove(null)
                }}
                disabled={isRemoving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleRemoveConfirm}
                disabled={isRemoving}
                className="bg-blue-600 hover:bg-blue-700 text-white ml-2"
              >
                {isRemoving ? "Removing..." : "Archive Lead"}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {selectedLead && (
        <LeadDetailsDialog
          lead={selectedLead}
          open={showDetailsDialog}
          onOpenChange={(open) => setShowDetailsDialog(open)}
        />
      )}
    </div>
  )
}
