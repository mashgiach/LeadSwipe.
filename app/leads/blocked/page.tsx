"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import ProtectedRoute from "@/app/protected-route"
import { SideNav } from "@/components/side-nav"
import { BlockedLeadsList } from "@/components/blocked-leads-list"
import { Button } from "@/components/ui/button"
import { ArrowLeft, RefreshCw } from "lucide-react"
import { getBlockedLeads, type BlockedLead } from "@/services/lead-service"
import { useToast } from "@/contexts/toast-context"

export default function BlockedLeadsPage() {
  const [blockedLeads, setBlockedLeads] = useState<BlockedLead[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { user } = useAuth()
  const router = useRouter()
  const { addToast } = useToast()

  const fetchBlockedLeads = async () => {
    if (!user) return

    setIsLoading(true)
    try {
      console.log("Fetching blocked leads for user:", user.id)
      const leads = await getBlockedLeads(user.id)
      console.log("Blocked leads fetched:", leads)
      setBlockedLeads(leads)
    } catch (error) {
      console.error("Error fetching blocked leads:", error)
      addToast({
        title: "Error",
        description: "Failed to load blocked leads. Please try again.",
        type: "error",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchBlockedLeads()
  }, [user])

  const handleUnblock = (leadId: number) => {
    setBlockedLeads(blockedLeads.filter((item) => item.lead_id !== leadId))
  }

  const handleRefresh = () => {
    fetchBlockedLeads()
  }

  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        <SideNav />
        <main className="flex-1 overflow-auto">
          <div className="flex flex-col h-full">
            <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Blocked Leads</h1>
              </div>
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>

            <div className="p-4">
              <BlockedLeadsList blockedLeads={blockedLeads} isLoading={isLoading} onUnblock={handleUnblock} />
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
