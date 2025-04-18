"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence, type PanInfo } from "framer-motion"
import { ChevronDown, ChevronUp, X, Check, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Lead } from "@/services/lead-service"
import { getTextDirectionClass } from "@/lib/utils"

interface MobileLeadSwiperProps {
  leads: Lead[]
  onSwipeLeft: (lead: Lead) => void
  onSwipeRight: (lead: Lead) => void
  onInfoClick: (lead: Lead) => void
}

export function MobileLeadSwiper({ leads, onSwipeLeft, onSwipeRight, onInfoClick }: MobileLeadSwiperProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [expanded, setExpanded] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    setIsMobile(window.innerWidth < 768)
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const currentLead = leads[currentIndex]

  if (!currentLead) {
    return (
      <div className="flex h-[70vh] items-center justify-center rounded-xl bg-card p-6 text-center">
        <div>
          <h3 className="text-2xl font-bold">No more leads to review</h3>
          <p className="mt-2 text-muted-foreground">Check back later for new leads</p>
        </div>
      </div>
    )
  }

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 100
    if (info.offset.x > threshold) {
      handleSwipeRight()
    } else if (info.offset.x < -threshold) {
      handleSwipeLeft()
    }
  }

  const handleSwipeLeft = () => {
    onSwipeLeft(currentLead)
    setCurrentIndex((prevIndex) => (prevIndex + 1) % leads.length)
    setExpanded(false)
  }

  const handleSwipeRight = () => {
    onSwipeRight(currentLead)
    setCurrentIndex((prevIndex) => (prevIndex + 1) % leads.length)
    setExpanded(false)
  }

  const handleInfoClick = () => {
    onInfoClick(currentLead)
  }

  const toggleExpanded = () => {
    setExpanded(!expanded)
  }

  // Format the lead name
  const leadName =
    currentLead.first_name && currentLead.last_name
      ? `${currentLead.first_name} ${currentLead.last_name}`
      : currentLead.name || "Unknown"

  // Get post content
  const postContent = currentLead.post_text || ""
  const commentContent = currentLead.comment_text || ""
  const contentToShow = commentContent || postContent

  // Calculate content height based on expanded state
  const contentHeight = expanded ? "auto" : "100px"

  return (
    <div className="relative h-[80vh] w-full overflow-hidden rounded-xl bg-card">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentLead.id}
          className="absolute inset-0 flex flex-col"
          initial={{ x: 300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -300, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          onDragEnd={handleDragEnd}
        >
          {/* Lead header */}
          <div className="relative h-1/3 w-full overflow-hidden">
            <div
              className="h-full w-full bg-cover bg-center"
              style={{
                backgroundImage: `url(${currentLead.profile_picture || "/default-profile.png"})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 text-white">
              <h2 className={`text-2xl font-bold ${getTextDirectionClass(leadName)}`}>{leadName}</h2>
              {currentLead.email && (
                <p className={`text-sm opacity-90 ${getTextDirectionClass(currentLead.email)}`}>{currentLead.email}</p>
              )}
            </div>
          </div>

          {/* Lead content */}
          <div className="flex flex-1 flex-col overflow-hidden p-4">
            {/* Post author */}
            {currentLead.post_author && (
              <div className="mb-2">
                <span className="text-xs font-medium text-muted-foreground">Posted by: </span>
                <span className={`text-sm font-medium ${getTextDirectionClass(currentLead.post_author)}`}>
                  {currentLead.post_author}
                </span>
              </div>
            )}

            {/* Comment author */}
            {currentLead.comment_author_name && (
              <div className="mb-2">
                <span className="text-xs font-medium text-muted-foreground">Comment by: </span>
                <span className={`text-sm font-medium ${getTextDirectionClass(currentLead.comment_author_name)}`}>
                  {currentLead.comment_author_name}
                </span>
              </div>
            )}

            {/* Post/Comment content */}
            <motion.div className="overflow-hidden" animate={{ height: contentHeight }} transition={{ duration: 0.3 }}>
              {contentToShow ? (
                <div className={`text-sm ${getTextDirectionClass(contentToShow)}`}>{contentToShow}</div>
              ) : (
                <p className="text-sm text-muted-foreground">No content available</p>
              )}

              {/* Additional info */}
              {currentLead.timestamp && (
                <div className="mt-3 text-xs text-muted-foreground">
                  {new Date(currentLead.timestamp).toLocaleDateString()}
                </div>
              )}

              {/* Tags */}
              {currentLead.tags && currentLead.tags.length > 0 && (
                <div className="mt-3">
                  <h3 className="text-xs font-semibold">Tags:</h3>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {currentLead.tags.map((tag, i) => (
                      <span key={i} className="rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>

            {/* Read more button */}
            <button onClick={toggleExpanded} className="mt-2 flex items-center justify-center text-sm text-primary">
              {expanded ? (
                <>
                  Show less <ChevronUp className="ml-1 h-4 w-4" />
                </>
              ) : (
                <>
                  Read more <ChevronDown className="ml-1 h-4 w-4" />
                </>
              )}
            </button>

            {/* Action buttons */}
            <div className="mt-auto flex justify-center gap-4 p-4">
              <Button
                variant="outline"
                size="icon"
                className="h-14 w-14 rounded-full border-2 border-destructive text-destructive"
                onClick={handleSwipeLeft}
              >
                <X className="h-8 w-8" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-14 w-14 rounded-full border-2 border-muted-foreground text-muted-foreground"
                onClick={handleInfoClick}
              >
                <Info className="h-6 w-6" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-14 w-14 rounded-full border-2 border-primary text-primary"
                onClick={handleSwipeRight}
              >
                <Check className="h-8 w-8" />
              </Button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
