"use client"
import ProtectedRoute from "@/app/protected-route"
import { SideNav } from "@/components/side-nav"
import { LeadStatsDashboard } from "@/components/lead-stats-dashboard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function DashboardPage() {
  const stats = {
    totalLeads: 150,
    matchedLeads: 120,
    blockedLeads: 10,
  }

  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        <SideNav />
        <main className="flex-1 overflow-auto">
          <div className="flex flex-col h-full">
            <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Dashboard</h1>
            </div>

            <div className="container mx-auto px-4 py-8">
              <div className="mt-8 grid gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <LeadStatsDashboard />
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
