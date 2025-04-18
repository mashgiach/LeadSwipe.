"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import ProtectedRoute from "@/app/protected-route"
import { SideNav } from "@/components/side-nav"
import { GroupsList } from "@/components/groups-list"
import { GroupForm } from "@/components/group-form"
import { getUserGroups, type FacebookGroup } from "@/services/group-service"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export default function GroupsPage() {
  const { user } = useAuth()
  const [groups, setGroups] = useState<FacebookGroup[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isFormOpen, setIsFormOpen] = useState(false)

  useEffect(() => {
    const fetchGroups = async () => {
      if (!user) return

      setIsLoading(true)
      try {
        const userGroups = await getUserGroups(user.id)
        setGroups(userGroups)
      } catch (error) {
        console.error("Error fetching groups:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchGroups()
  }, [user])

  const handleGroupAdded = (group: FacebookGroup) => {
    setGroups([group, ...groups])
    setIsFormOpen(false)
  }

  const handleGroupRemoved = (groupId: number) => {
    setGroups(groups.filter((group) => group.id !== groupId))
  }

  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        <SideNav />
        <main className="flex-1 overflow-auto">
          <div className="flex flex-col h-full">
            <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 flex items-center justify-between">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Facebook Groups</h1>
              <Button onClick={() => setIsFormOpen(true)} size="sm">
                <Plus className="mr-2 h-4 w-4" /> Add Group
              </Button>
            </div>

            <div className="p-4">
              <GroupsList groups={groups} isLoading={isLoading} onGroupRemoved={handleGroupRemoved} />
            </div>
          </div>

          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add Facebook Group</DialogTitle>
              </DialogHeader>
              <GroupForm onGroupAdded={handleGroupAdded} maxGroups={10} currentCount={groups.length} />
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </ProtectedRoute>
  )
}
