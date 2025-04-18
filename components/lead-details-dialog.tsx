"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Building2, MapPin, Users, Briefcase, Tag, Mail, Phone, Globe, X } from "lucide-react"
import { getTextDirectionClass } from "@/lib/utils"
import type { Lead } from "@/services/lead-service"

interface LeadDetailsDialogProps {
  lead: Lead
  open: boolean
  onClose?: () => void
  onOpenChange?: (open: boolean) => void
}

export function LeadDetailsDialog({ lead, open, onClose, onOpenChange }: LeadDetailsDialogProps) {
  const [activeTab, setActiveTab] = useState<"info" | "content">("info")

  // Handle dialog close with compatibility for both onClose and onOpenChange
  const handleClose = () => {
    if (onClose) {
      onClose()
    } else if (onOpenChange) {
      onOpenChange(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          handleClose()
        }
      }}
    >
      <DialogContent className="sm:max-w-md md:max-w-lg lg:max-w-2xl bg-white dark:bg-gray-900 p-0 overflow-hidden">
        <DialogHeader className="p-4 md:p-6 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl md:text-2xl font-bold">Lead Details</DialogTitle>
          </div>
        </DialogHeader>

        <div className="flex flex-col md:flex-row h-full">
          {/* Sidebar with lead info */}
          <div className="w-full md:w-1/3 border-r border-border/30 p-4">
            <div className="flex flex-col items-center mb-4">
              <div className="h-24 w-24 rounded-full overflow-hidden border border-border/30 mb-2">
                <img
                  src={lead.logo_url || "/placeholder.svg?height=96&width=96"}
                  alt={`${lead.name || "Lead"} logo`}
                  className="h-full w-full object-cover"
                />
              </div>
              <h3 className={`text-lg font-semibold text-center ${getTextDirectionClass(lead.name)}`}>
                {lead.first_name && lead.last_name
                  ? `${lead.first_name} ${lead.last_name}`
                  : lead.name || "Unknown Name"}
              </h3>
              <p className="text-sm text-muted-foreground">{lead.position || "No position"}</p>
            </div>

            <div className="space-y-3">
              {lead.industry && (
                <div className="flex items-start gap-2">
                  <Building2 className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <span className="text-sm">{lead.industry}</span>
                </div>
              )}
              {lead.location && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <span className="text-sm">{lead.location}</span>
                </div>
              )}
              {lead.employees && (
                <div className="flex items-start gap-2">
                  <Users className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <span className="text-sm">{lead.employees} employees</span>
                </div>
              )}
              {lead.email && (
                <div className="flex items-start gap-2">
                  <Mail className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <span className="text-sm break-all">{lead.email}</span>
                </div>
              )}
              {lead.phone && (
                <div className="flex items-start gap-2">
                  <Phone className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <span className="text-sm">{lead.phone}</span>
                </div>
              )}
              {lead.profile_url && (
                <div className="flex items-start gap-2">
                  <Globe className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <a
                    href={lead.profile_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline break-all"
                  >
                    Profile
                  </a>
                </div>
              )}
              {lead.tags && lead.tags.length > 0 && (
                <div className="flex items-start gap-2">
                  <Tag className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div className="flex flex-wrap gap-1">
                    {lead.tags.map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {lead.group_name && (
                <div className="flex items-start gap-2">
                  <Briefcase className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <span className="text-sm">{lead.group_name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Main content area */}
          <div className="w-full md:w-2/3 flex flex-col">
            <div className="border-b border-border/30 flex">
              <button
                className={`px-4 py-2 text-sm font-medium ${
                  activeTab === "info"
                    ? "border-b-2 border-primary text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setActiveTab("info")}
              >
                Description
              </button>
              <button
                className={`px-4 py-2 text-sm font-medium ${
                  activeTab === "content"
                    ? "border-b-2 border-primary text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setActiveTab("content")}
              >
                Content
              </button>
            </div>

            <ScrollArea className="flex-1 p-4 h-[300px]">
              {activeTab === "info" && (
                <div className="space-y-4">
                  {lead.description ? (
                    <p className="text-sm whitespace-pre-wrap">{lead.description}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">No description available.</p>
                  )}
                </div>
              )}

              {activeTab === "content" && (
                <div className="space-y-4">
                  {lead.post_text && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Post</h4>
                      <div className="rounded-md border border-border/30 p-3 bg-muted/30">
                        <p className="text-sm whitespace-pre-wrap">{lead.post_text}</p>
                        {lead.post_author && (
                          <p className="text-xs text-muted-foreground mt-2">Posted by: {lead.post_author}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {lead.comment_text && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Comment</h4>
                      <div className="rounded-md border border-border/30 p-3 bg-muted/30">
                        <p className="text-sm whitespace-pre-wrap">{lead.comment_text}</p>
                        {lead.comment_author_name && (
                          <p className="text-xs text-muted-foreground mt-2">Commented by: {lead.comment_author_name}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {!lead.post_text && !lead.comment_text && (
                    <p className="text-sm text-muted-foreground">No content available.</p>
                  )}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
