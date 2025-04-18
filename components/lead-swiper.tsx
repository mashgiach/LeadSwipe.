"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Check, X, Star, Building2, Users, MapPin, Bookmark, List, UsersRound, Archive, Loader2 } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MatchDialog } from "@/components/match-dialog"
import { LeadsList } from "@/components/leads-list"
import { SavedLeadsList } from "@/components/saved-leads-list"
import { LeadCardActions } from "@/components/lead-card-actions"
import { getTextDirectionClass } from "@/lib/utils"
import {
  getViewedLeadIds,
  markLeadAsViewed,
  saveLead,
  unsaveLead,
  getSavedLeadIds,
  matchLead,
  unmatchLead,
  getMatchedLeadIds,
  getBlockedLeadIds,
  archiveLead,
  restoreArchivedLead,
  getArchivedLeads,
  getArchivedLeadIds,
  type Lead,
  getPaginatedLeads,
} from "@/services/lead-service"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getUserGroups, getGroupLeads } from "@/services/group-service"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MobileLeadSwiper } from "./mobile-lead-swiper"

// Function to get the profile image URL
const getProfileImageUrl = (lead: Lead): string | undefined => {
  if (lead.image_url) {
    return lead.image_url
  }

  // If no Facebook image, return the logo URL
  return lead.logo_url
}

export function LeadSwiper() {
  const { user } = useAuth()
  const router = useRouter()

  // Data sources
  const [allLeads, setAllLeads] = useState<Lead[]>([])
  const [groupLeads, setGroupLeads] = useState<Lead[]>([])
  const [matchedLeads, setMatchedLeads] = useState<Lead[]>([])
  const [savedLeads, setSavedLeads] = useState<Lead[]>([])
  const [archivedLeads, setArchivedLeads] = useState<Lead[]>([]) // Initialize as empty array

  // Pagination state
  const [allLeadsPage, setAllLeadsPage] = useState(1)
  const [groupLeadsPage, setGroupLeadsPage] = useState(1)
  const [hasMoreAllLeads, setHasMoreAllLeads] = useState(true)
  const [hasMoreGroupLeads, setHasMoreGroupLeads] = useState(true)
  const [loadingMoreLeads, setLoadingMoreLeads] = useState(false)

  // IDs for filtering
  const [viewedLeadIds, setViewedLeadIds] = useState<number[]>([])
  const [blockedLeadIds, setBlockedLeadIds] = useState<number[]>([])
  const [archivedLeadIds, setArchivedLeadIds] = useState<number[]>([])
  const [userGroups, setUserGroups] = useState<string[]>([])

  // UI state
  const [activeTab, setActiveTab] = useState("all")
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingGroups, setIsLoadingGroups] = useState(false)
  const [showMatch, setShowMatch] = useState(false)
  const [matchedLead, setMatchedLead] = useState<Lead | null>(null)
  const [showLeadsList, setShowLeadsList] = useState(false)
  const [showSavedLeadsList, setShowSavedLeadsList] = useState(false)
  const [showArchivedLeads, setShowArchivedLeads] = useState(false)
  const [expandedText, setExpandedText] = useState(false)

  // Swipe animation state
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [offsetX, setOffsetX] = useState(0)
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  // Get the current lead based on active tab
  const currentLead = activeTab === "all" ? allLeads[0] : groupLeads[0]
  const noLeadsAvailable =
    activeTab === "all" ? allLeads.length === 0 && !hasMoreAllLeads : groupLeads.length === 0 && !hasMoreGroupLeads

  // Add these state variables
  const [isLoadingMoreLeads, setIsLoadingMoreLeads] = useState(false)
  const [hasMoreLeads, setHasMoreLeads] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  // Add a state to track if we're on mobile:
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  // Update the fetchData function to use pagination
  const fetchData = async (page = 1) => {
    if (!user) return

    const isFirstLoad = page === 1

    if (isFirstLoad) {
      setIsLoading(true)
    } else {
      setIsLoadingMoreLeads(true)
    }

    try {
      // Fetch viewed lead IDs
      const viewedIds = await getViewedLeadIds(user.id)
      if (isFirstLoad) {
        setViewedLeadIds(viewedIds)
      }

      // Fetch blocked lead IDs
      const blockedIds = await getBlockedLeadIds(user.id)
      if (isFirstLoad) {
        setBlockedLeadIds(blockedIds)
      }

      // Fetch archived lead IDs
      const archivedIds = await getArchivedLeadIds(user.id)
      if (isFirstLoad) {
        setArchivedLeadIds(archivedIds)
      }

      // Fetch archived leads from database - make sure we get the data array
      const archivedLeadsResponse = await getArchivedLeads(user.id, 1, 20)
      if (isFirstLoad) {
        // Make sure we're setting the data array, not the whole response
        setArchivedLeads(archivedLeadsResponse.data || [])
      }

      // Fetch leads with pagination
      const { data: paginatedLeads, count } = await getPaginatedLeads(page, pageSize)

      // Filter out already viewed, blocked, and archived leads
      const availableLeads = paginatedLeads.filter(
        (lead) => !viewedIds.includes(lead.id) && !blockedIds.includes(lead.id) && !archivedIds.includes(lead.id),
      )

      if (isFirstLoad) {
        setAllLeads(availableLeads)
      } else {
        setAllLeads((prev) => [...prev, ...availableLeads])
      }

      // Check if there are more leads to load
      setHasMoreLeads(page * pageSize < count)

      // If we're on the first page, also fetch other data
      if (isFirstLoad) {
        // Fetch saved leads
        const savedIds = await getSavedLeadIds(user.id)
        const savedLeadsList = paginatedLeads.filter((lead) => savedIds.includes(lead.id))
        setSavedLeads(savedLeadsList)

        // Fetch matched leads
        const matchedIds = await getMatchedLeadIds(user.id)
        const matchedLeadsList = paginatedLeads.filter((lead) => matchedIds.includes(lead.id))
        setMatchedLeads(matchedLeadsList)

        // Fetch user groups
        const groups = await getUserGroups(user.id)
        const groupIds = groups.map((group) => group.group_id)
        setUserGroups(groupIds)

        if (groupIds.length > 0) {
          // Get leads that belong to user's groups
          const groupLeadIds = await getGroupLeads(user.id, groupIds)

          // Filter group leads that are not viewed, blocked, or archived
          const availableGroupLeads = paginatedLeads.filter(
            (lead) =>
              groupLeadIds.includes(lead.id) &&
              !viewedIds.includes(lead.id) &&
              !blockedIds.includes(lead.id) &&
              !archivedIds.includes(lead.id),
          )

          setGroupLeads(availableGroupLeads)
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      if (isFirstLoad) {
        setIsLoading(false)
      } else {
        setIsLoadingMoreLeads(false)
      }
      setIsLoadingGroups(false)
    }
  }

  // Update the useEffect to call the new fetchData function
  useEffect(() => {
    fetchData(1)
  }, [user])

  // Add a function to load more leads
  const loadMoreLeads = () => {
    if (hasMoreLeads && !isLoadingMoreLeads) {
      const nextPage = currentPage + 1
      setCurrentPage(nextPage)
      fetchData(nextPage)
    }
  }

  // Add a check to load more leads when the user is running low
  useEffect(() => {
    // If we're down to the last 3 leads, load more
    if (allLeads.length <= 3 && hasMoreLeads && !isLoadingMoreLeads) {
      loadMoreLeads()
    }
  }, [allLeads.length, hasMoreLeads, isLoadingMoreLeads])

  // Handle swipe action (like or pass)
  const handleSwipe = async (liked: boolean) => {
    if (!user || !currentLead) return

    setIsAnimating(true)
    setSwipeDirection(liked ? "right" : "left")

    // Move to the next card after a delay
    const moveToNextCard = () => {
      setTimeout(() => {
        // Remove the current lead from the appropriate list
        if (activeTab === "all") {
          setAllLeads(allLeads.slice(1))
        } else {
          setGroupLeads(groupLeads.slice(1))
        }

        setOffsetX(0)
        setSwipeDirection(null)
        setIsAnimating(false)
        setExpandedText(false) // Reset expanded text state
      }, 300)
    }

    try {
      // Mark lead as viewed
      await markLeadAsViewed(user.id, currentLead.id)

      // Only add to viewedLeadIds if it's not already there
      if (!viewedLeadIds.includes(currentLead.id)) {
        setViewedLeadIds([...viewedLeadIds, currentLead.id])
      }

      if (liked) {
        try {
          // Match with lead
          await matchLead(user.id, currentLead.id)

          // Only add to matchedLeads if it's not already there
          if (!matchedLeads.some((matchedLead) => matchedLead.id === currentLead.id)) {
            setMatchedLeads([...matchedLeads, currentLead])
          }

          // Show match dialog
          setMatchedLead(currentLead)
          setShowMatch(true)
        } catch (error) {
          console.error("Error matching with lead:", error)
        }
      } else {
        // If swiped left (passed), archive the lead in the database
        if (!archivedLeads.some((archivedLead) => archivedLead.id === currentLead.id)) {
          await archiveLead(user.id, currentLead.id)
          setArchivedLeads([...archivedLeads, currentLead])
          setArchivedLeadIds([...archivedLeadIds, currentLead.id])
        }
      }
    } catch (error) {
      console.error("Error during swipe:", error)
    } finally {
      moveToNextCard()
    }
  }

  // Handle saving/unsaving a lead
  const handleSaveLead = async () => {
    if (!user || !currentLead) return

    const isAlreadySaved = savedLeads.some((savedLead) => savedLead.id === currentLead.id)

    try {
      if (isAlreadySaved) {
        await unsaveLead(user.id, currentLead.id)
        setSavedLeads(savedLeads.filter((savedLead) => savedLead.id !== currentLead.id))
      } else {
        await saveLead(user.id, currentLead.id)
        setSavedLeads([...savedLeads, currentLead])
      }
    } catch (error) {
      console.error("Error saving/unsaving lead:", error)
    }
  }

  // Handle removing a lead from the feed
  const handleRemoveLead = () => {
    if (activeTab === "all") {
      setAllLeads(allLeads.slice(1))
    } else {
      setGroupLeads(groupLeads.slice(1))
    }
    setExpandedText(false) // Reset expanded text state
  }

  // Handle blocking a lead
  const handleBlockLead = () => {
    if (activeTab === "all") {
      setAllLeads(allLeads.slice(1))
    } else {
      setGroupLeads(groupLeads.slice(1))
    }
    setExpandedText(false) // Reset expanded text state
  }

  const handleRestoreArchivedLead = async (leadId: number) => {
    if (!user) return

    const leadToRestore = archivedLeads.find((lead) => lead.id === leadId)
    if (!leadToRestore) return

    try {
      // Remove from archived leads in the database
      await restoreArchivedLead(user.id, leadId)

      // Update local state
      setArchivedLeads(archivedLeads.filter((lead) => lead.id !== leadId))
      setArchivedLeadIds(archivedLeadIds.filter((id) => id !== leadId))

      // Add back to appropriate feed based on group membership
      if (leadToRestore.group_id && userGroups.includes(leadToRestore.group_id)) {
        setGroupLeads([...groupLeads, leadToRestore])
      } else {
        setAllLeads([...allLeads, leadToRestore])
      }

      // Remove from viewed leads to make it appear in the feed again
      setViewedLeadIds(viewedLeadIds.filter((id) => id !== leadId))
    } catch (error) {
      console.error("Error restoring archived lead:", error)
    }
  }

  const isLeadSaved = savedLeads.some((savedLead) => savedLead?.id === currentLead?.id)

  // Toggle expanded text
  const toggleExpandText = (e: React.MouseEvent) => {
    e.stopPropagation()
    setExpandedText(!expandedText)
  }

  // Mouse/touch event handlers for swiping
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true)
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX
    setStartX(clientX)
  }

  const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return

    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX
    const newOffsetX = clientX - startX
    setOffsetX(newOffsetX)

    // Determine swipe direction for visual feedback
    if (newOffsetX > 50) {
      setSwipeDirection("right")
    } else if (newOffsetX < -50) {
      setSwipeDirection("left")
    } else {
      setSwipeDirection(null)
    }
  }

  const handleDragEnd = () => {
    if (!isDragging) return

    setIsDragging(false)

    // If swiped far enough, trigger the appropriate action
    if (offsetX > 100) {
      handleSwipe(true) // Swiped right (like)
    } else if (offsetX < -100) {
      handleSwipe(false) // Swiped left (pass)
    } else {
      // Reset if not swiped far enough
      setOffsetX(0)
      setSwipeDirection(null)
    }
  }

  // Calculate card styles based on drag state
  const cardStyle = {
    transform: `translateX(${offsetX}px) rotate(${offsetX * 0.05}deg)`,
    transition: isDragging ? "none" : "transform 0.3s ease",
    opacity: isAnimating ? (swipeDirection === "left" ? 0 : 1) : 1,
  }

  // Additional animation styles when swiping
  const getAnimationStyle = () => {
    if (isAnimating && swipeDirection === "right") {
      return {
        transform: "translateX(1000px) rotate(30deg)",
        opacity: 0,
        transition: "transform 0.3s ease, opacity 0.3s ease",
      }
    } else if (isAnimating && swipeDirection === "left") {
      return {
        transform: "translateX(-1000px) rotate(-30deg)",
        opacity: 0,
        transition: "transform 0.3s ease, opacity 0.3s ease",
      }
    }
    return {}
  }

  // Render the lead card
  const renderLeadCard = (lead: Lead) => {
    if (!lead) return null

    // Determine if text should be truncated
    const description = lead.comment_text || lead.post_text || lead.description || ""
    const isTruncatable = description.length > 150
    const displayText = isTruncatable && !expandedText ? `${description.substring(0, 150)}...` : description

    return (
      <Card
        className="overflow-hidden border-border/30 bg-card shadow-lg cursor-grab active:cursor-grabbing shopify-card h-[calc(100vh-180px)] sm:h-auto max-h-[80vh] sm:max-h-none"
        ref={cardRef}
        style={{ ...cardStyle, ...getAnimationStyle() }}
        onMouseDown={handleDragStart}
        onMouseMove={handleDragMove}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        onTouchStart={handleDragStart}
        onTouchMove={handleDragMove}
        onTouchEnd={handleDragEnd}
      >
        <LeadCardActions leadId={lead.id} onRemove={handleRemoveLead} onBlock={handleBlockLead} />

        {swipeDirection === "right" && (
          <div className="absolute top-4 right-4 z-10 rotate-12 rounded-md bg-green-500 px-4 py-2 text-white font-bold border-2 border-white/30">
            LIKE
          </div>
        )}
        {swipeDirection === "left" && (
          <div className="absolute top-4 left-4 z-10 -rotate-12 rounded-md bg-red-500 px-4 py-2 text-white font-bold border-2 border-white/30">
            PASS
          </div>
        )}

        <div className="relative h-[40vh] sm:h-80 w-full bg-muted">
          <img
            src={getProfileImageUrl(lead) || "/placeholder.svg"}
            alt={lead.name}
            className="h-full w-full object-cover"
            draggable="false"
            onError={(e) => {
              // Fallback if Facebook image fails to load
              ;(e.target as HTMLImageElement).src = lead.image_url || "/placeholder.svg"
            }}
          />
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/60 to-transparent p-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 overflow-hidden rounded-full bg-black p-1 border border-primary/30">
                <img
                  src={lead.logo_url || "/placeholder.svg"}
                  alt={`${lead.name} logo`}
                  className="h-full w-full object-contain"
                  draggable="false"
                />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  {lead.first_name && lead.last_name ? `${lead.first_name} ${lead.last_name}` : lead.name}
                </h2>
                <p className="text-sm text-white/80">{lead.position}</p>
              </div>
            </div>
          </div>
        </div>
        <CardHeader className="border-b border-border/20">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span className={getTextDirectionClass(lead.location)}>{lead.location || "Facebook Lead"}</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-4 overflow-auto max-h-[30vh] sm:max-h-none">
          <p className={`text-foreground/80 ${getTextDirectionClass(description)}`}>
            {displayText}
            {isTruncatable && (
              <button
                onClick={toggleExpandText}
                className="ml-2 text-red-600 dark:text-red-400 font-medium hover:underline"
              >
                {expandedText ? "Show less" : "Read more"}
              </button>
            )}
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary/80" />
              <span className={`text-sm ${getTextDirectionClass(lead.industry)}`}>{lead.industry || "Facebook"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary/80" />
              <span className={`text-sm ${getTextDirectionClass(lead.employees)}`}>{lead.employees || "Lead"}</span>
            </div>
          </div>

          {lead.tags && lead.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {lead.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className={`bg-primary/10 text-primary border border-primary/30 ${getTextDirectionClass(tag)}`}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between gap-2 pt-0 sticky bottom-0 bg-card border-t border-border/20 p-4">
          <Button
            variant="outline"
            size="icon"
            className="h-14 w-14 rounded-full border-2 border-destructive text-destructive bg-destructive/10 hover:bg-destructive/20 hover:text-destructive shadow-sm"
            onClick={() => handleSwipe(false)}
          >
            <X className="h-6 w-6" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className={`h-12 w-12 rounded-full border-2 transition-colors duration-300 shadow-sm ${
              isLeadSaved
                ? "bg-amber-400 border-amber-400 text-black"
                : "border-amber-400/70 text-amber-400/70 bg-amber-400/10 hover:bg-amber-400/20"
            }`}
            onClick={handleSaveLead}
          >
            <Star className="h-5 w-5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-14 w-14 rounded-full border-2 border-blue-600 text-blue-600 bg-blue-50 hover:bg-blue-100 hover:text-blue-700 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 dark:text-blue-400 shadow-sm"
            onClick={() => handleSwipe(true)}
          >
            <Check className="h-6 w-6" />
          </Button>
        </CardFooter>
      </Card>
    )
  }

  // Add a "Load More" button to the empty state
  const renderEmptyState = () => {
    if (activeTab === "all") {
      return (
        <div className="text-center max-w-md">
          <div className="flex flex-col items-center justify-center gap-6">
            <div className="rounded-full bg-blue-100 p-6 dark:bg-blue-900/30">
              <Users className="h-12 w-12 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-4 text-blue-700 dark:text-blue-400">No new leads found</h2>
              <p className="text-muted-foreground mb-6">
                We'll show you new leads when we find them. Check back later or try exploring your existing matches.
              </p>
            </div>
          </div>
          <div className="flex flex-col items-center gap-4">
            <div className="flex justify-center gap-4">
              <Button onClick={() => router.push("/leads")} className="gap-2">
                <List className="h-4 w-4" />
                View All Leads
              </Button>
              <Button variant="outline" onClick={() => setShowLeadsList(true)}>
                View Matches
              </Button>
            </div>

            {hasMoreLeads && (
              <Button onClick={loadMoreLeads} disabled={isLoadingMoreLeads} variant="outline" className="mt-4">
                {isLoadingMoreLeads ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent mr-2"></div>
                    Loading more leads...
                  </>
                ) : (
                  "Load More Leads"
                )}
              </Button>
            )}
          </div>
        </div>
      )
    } else {
      // Group leads empty state remains the same
      return (
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold mb-4 text-primary">No Group Leads Found</h2>
          <p className="text-muted-foreground mb-6">
            We couldn't find any leads from your linked Facebook groups. Check back later or try linking more groups.
          </p>
          <Button onClick={() => router.push("/groups")} className="gap-2">
            <UsersRound className="h-4 w-4" />
            Manage Facebook Groups
          </Button>
        </div>
      )
    }
  }

  // Handle unmatching a lead
  const handleUnmatchLead = async (leadId: number) => {
    if (!user) return

    try {
      // Remove from matched leads list
      setMatchedLeads(matchedLeads.filter((lead) => lead.id !== leadId))

      // Remove from database
      await unmatchLead(user.id, leadId)

      // Show notification or feedback
      console.log(`Unmatched lead ${leadId}`)
    } catch (error) {
      console.error("Error unmatching lead:", error)
    }
  }

  // Render loading state
  const renderLoadingState = () => (
    <div className="flex flex-col items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mb-4"></div>
      <p className="text-muted-foreground">Loading leads...</p>
    </div>
  )

  // Render loading more state at the bottom
  const renderLoadingMoreState = () => (
    <div className="flex justify-center mt-4">
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Loading more leads...</span>
      </div>
    </div>
  )

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-screen w-full flex-col">
      <header className="flex flex-col border-b border-border/30 bg-card">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-2xl font-bold text-red-600 dark:text-red-400">LeadSwipe</h1>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowArchivedLeads(true)}
              className="border-border/50 bg-background hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20 dark:hover:text-red-400 shopify-button"
            >
              <Archive className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Archived</span> ({archivedLeads?.length || 0})
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/leads")}
              className="border-border/50 bg-background hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20 dark:hover:text-red-400 shopify-button"
            >
              <List className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">All Leads</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowSavedLeadsList(true)}
              className="border-border/50 bg-background hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20 dark:hover:text-red-400 shopify-button"
            >
              <Bookmark className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Saved</span> ({savedLeads.length})
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowLeadsList(true)}
              className="border-border/50 bg-background hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20 dark:hover:text-red-400 shopify-button"
            >
              <span className="hidden sm:inline">Matched</span> ({matchedLeads.length})
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 shopify-gradient w-full h-full">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
          <div className="border-b border-border/30 bg-card">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="all">All Leads</TabsTrigger>
              <TabsTrigger value="groups" disabled={userGroups.length === 0}>
                My Groups {userGroups.length > 0 && `(${userGroups.length})`}
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="h-full w-full flex items-center justify-center p-4 sm:p-6">
            {isLoadingGroups && activeTab === "groups" ? (
              renderLoadingState()
            ) : userGroups.length === 0 && activeTab === "groups" ? (
              <div className="text-center max-w-md">
                <h2 className="text-2xl font-bold mb-4 text-primary">No Facebook Groups Linked</h2>
                <p className="text-muted-foreground mb-6">
                  You haven't linked any Facebook groups yet. Add groups to see leads from your favorite communities.
                </p>
                <Button onClick={() => router.push("/groups")} className="gap-2">
                  <UsersRound className="h-4 w-4" />
                  Manage Facebook Groups
                </Button>
              </div>
            ) : noLeadsAvailable ? (
              renderEmptyState()
            ) : currentLead ? (
              <div className="relative max-w-md w-full">
                {isMobile ? (
                  <MobileLeadSwiper
                    leads={activeTab === "all" ? allLeads : groupLeads}
                    onSwipeLeft={() => handleSwipe(false)}
                    onSwipeRight={() => handleSwipe(true)}
                    onInfoClick={() => {}} // Add your info click handler here
                  />
                ) : (
                  renderLeadCard(currentLead)
                )}
                {loadingMoreLeads && renderLoadingMoreState()}
              </div>
            ) : (
              renderLoadingState()
            )}
          </div>
        </Tabs>
      </div>

      {/* Match Dialog */}
      {showMatch && matchedLead && (
        <MatchDialog
          lead={matchedLead}
          open={showMatch}
          onClose={() => setShowMatch(false)}
          onUnmatch={handleUnmatchLead}
        />
      )}

      {/* Matched Leads List */}
      {showLeadsList && (
        <LeadsList
          leads={matchedLeads}
          open={showLeadsList}
          onClose={() => setShowLeadsList(false)}
          onUnmatch={handleUnmatchLead}
        />
      )}

      {/* Saved Leads List */}
      {showSavedLeadsList && (
        <SavedLeadsList leads={savedLeads} open={showSavedLeadsList} onClose={() => setShowSavedLeadsList(false)} />
      )}

      {/* Archived Leads Dialog */}
      <Dialog open={showArchivedLeads} onOpenChange={setShowArchivedLeads}>
        <DialogContent className="sm:max-w-md md:max-w-lg border-border/30 bg-card">
          <DialogHeader>
            <DialogTitle className="text-primary">Archived Leads</DialogTitle>
          </DialogHeader>
          {!archivedLeads || archivedLeads.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-muted-foreground">No archived leads yet. Swipe left on leads to archive them.</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {archivedLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className="flex items-center justify-between rounded-lg border border-border/30 bg-background p-3 hover:border-primary/30 transition-colors duration-300"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 overflow-hidden rounded-full bg-background p-1 border border-primary/30">
                        <img
                          src={getProfileImageUrl(lead) || "/placeholder.svg"}
                          alt={`${lead.name} profile`}
                          className="h-full w-full"
                        />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{lead.name}</p>
                        <p className="text-sm text-muted-foreground">{lead.position}</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleRestoreArchivedLead(lead.id)}>
                      Restore
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
