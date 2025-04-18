"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Archive, Ban, Check, Star, Users } from "lucide-react"
import { getSupabaseBrowserClient } from "@/lib/supabase"

interface LeadStats {
  totalLeads: number
  archivedLeads: number
  blockedLeads: number
  matchedLeads: number
  savedLeads: number
}

export function LeadStatsDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState<LeadStats>({
    totalLeads: 0,
    archivedLeads: 0,
    blockedLeads: 0,
    matchedLeads: 0,
    savedLeads: 0,
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return

      setIsLoading(true)
      const supabase = getSupabaseBrowserClient()

      try {
        // Get total leads count
        const { count: totalLeads, error: totalError } = await supabase
          .from("leads")
          .select("*", { count: "exact", head: true })

        // Get archived leads count
        const { count: archivedLeads, error: archivedError } = await supabase
          .from("archived_leads")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)

        // Get blocked leads count
        const { count: blockedLeads, error: blockedError } = await supabase
          .from("blocked_leads")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)

        // Get matched leads count
        const { count: matchedLeads, error: matchedError } = await supabase
          .from("matched_leads")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)

        // Get saved leads count
        const { count: savedLeads, error: savedError } = await supabase
          .from("saved_leads")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)

        if (totalError || archivedError || blockedError || matchedError || savedError) {
          console.error("Error fetching lead stats:", {
            totalError,
            archivedError,
            blockedError,
            matchedError,
            savedError,
          })
          return
        }

        setStats({
          totalLeads: totalLeads || 0,
          archivedLeads: archivedLeads || 0,
          blockedLeads: blockedLeads || 0,
          matchedLeads: matchedLeads || 0,
          savedLeads: savedLeads || 0,
        })
      } catch (error) {
        console.error("Error fetching lead stats:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [user])

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-blue-700 dark:text-blue-400">Lead Statistics</h2>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="border-border/30 bg-card shadow-lg shopify-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg animate-pulse bg-muted h-6 w-24 rounded"></CardTitle>
                <CardDescription className="animate-pulse bg-muted h-4 w-16 rounded"></CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold animate-pulse bg-muted h-8 w-12 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            title="Total Leads"
            value={stats.totalLeads}
            icon={<Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
            description="Available leads"
          />
          <StatCard
            title="Archived"
            value={stats.archivedLeads}
            icon={<Archive className="h-5 w-5 text-amber-600 dark:text-amber-400" />}
            description="Passed leads"
          />
          <StatCard
            title="Blocked"
            value={stats.blockedLeads}
            icon={<Ban className="h-5 w-5 text-red-600 dark:text-red-400" />}
            description="Blocked leads"
          />
          <StatCard
            title="Matched"
            value={stats.matchedLeads}
            icon={<Check className="h-5 w-5 text-green-600 dark:text-green-400" />}
            description="Matched leads"
          />
          <StatCard
            title="Saved"
            value={stats.savedLeads}
            icon={<Star className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />}
            description="Saved leads"
          />
        </div>
      )}
    </div>
  )
}

interface StatCardProps {
  title: string
  value: number
  icon: React.ReactNode
  description: string
}

function StatCard({ title, value, icon, description }: StatCardProps) {
  return (
    <Card className="border-border/30 bg-card shadow-lg shopify-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
      </CardContent>
    </Card>
  )
}
