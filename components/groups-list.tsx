"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Loader2, Users, ExternalLink, Trash } from "lucide-react"
import { removeFacebookGroup, type FacebookGroup } from "@/services/group-service"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface GroupsListProps {
  groups: FacebookGroup[]
  isLoading: boolean
  onGroupRemoved: (groupId: number) => void
}

export function GroupsList({ groups, isLoading, onGroupRemoved }: GroupsListProps) {
  const { user } = useAuth()
  const [deletingGroupId, setDeletingGroupId] = useState<number | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const handleDeleteClick = (groupId: number) => {
    setDeletingGroupId(groupId)
    setShowDeleteDialog(true)
  }

  const handleDeleteConfirm = async () => {
    if (!user || deletingGroupId === null) return

    setIsDeleting(true)
    try {
      await removeFacebookGroup(user.id, deletingGroupId)
      onGroupRemoved(deletingGroupId)
    } catch (error) {
      console.error("Error removing group:", error)
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
      setDeletingGroupId(null)
    }
  }

  const handleDeleteCancel = () => {
    setShowDeleteDialog(false)
    setDeletingGroupId(null)
  }

  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  return (
    <>
      <Card className="border-border/30 bg-card shadow-lg shopify-card w-full">
        <CardHeader>
          <CardTitle className="text-blue-700 dark:text-blue-400">Linked Facebook Groups</CardTitle>
          <CardDescription>
            Manage your linked Facebook groups. You have {groups.length} of 10 groups linked.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {groups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No Facebook groups linked yet</p>
              <p className="text-sm text-muted-foreground mt-2">Add a Facebook group above to start filtering leads</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Group Name</TableHead>
                    <TableHead>Group ID</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groups.map((group) => (
                    <TableRow key={group.id}>
                      <TableCell className="font-medium">{group.group_name}</TableCell>
                      <TableCell>{group.group_id}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => window.open(group.group_url, "_blank")}
                          >
                            <ExternalLink className="h-4 w-4" />
                            <span className="sr-only">Open Group</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => handleDeleteClick(group.id)}
                          >
                            <Trash className="h-4 w-4" />
                            <span className="sr-only">Unlink Group</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="border-border/30 bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Unlink Facebook Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to unlink this Facebook group? This will remove it from your account, but won't
              affect the group itself.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDeleteCancel} disabled={isDeleting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Unlinking...
                </>
              ) : (
                "Unlink Group"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
