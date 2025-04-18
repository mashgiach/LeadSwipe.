"use client"

import type React from "react"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, Loader2, Plus } from "lucide-react"
import { addFacebookGroup, extractFacebookGroupId, type FacebookGroup } from "@/services/group-service"

interface GroupFormProps {
  onGroupAdded: (group: FacebookGroup) => void
  maxGroups: number
  currentCount: number
}

export function GroupForm({ onGroupAdded, maxGroups, currentCount }: GroupFormProps) {
  const { user } = useAuth()
  const [groupUrl, setGroupUrl] = useState("")
  const [groupName, setGroupName] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) return

    setIsSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      // Validate URL
      if (!groupUrl.includes("facebook.com/groups/")) {
        throw new Error("Please enter a valid Facebook group URL")
      }

      // Extract group ID
      const groupId = extractFacebookGroupId(groupUrl)
      if (!groupId) {
        throw new Error("Could not extract group ID from URL")
      }

      // Add group
      const newGroup = await addFacebookGroup(user.id, {
        group_id: groupId,
        group_name: groupName.trim() || `Facebook Group ${currentCount + 1}`,
        group_url: groupUrl,
      })

      if (newGroup) {
        onGroupAdded(newGroup)
        setGroupUrl("")
        setGroupName("")
        setSuccess("Group added successfully")
        setTimeout(() => setSuccess(null), 3000)
      }
    } catch (error) {
      console.error("Error adding group:", error)
      setError(error instanceof Error ? error.message : "Failed to add group")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 text-sm text-green-600 bg-green-100 dark:bg-green-900/20 dark:text-green-400 p-3 rounded-md">
          <Plus className="h-4 w-4" />
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="group-url">Facebook Group URL</Label>
          <Input
            id="group-url"
            value={groupUrl}
            onChange={(e) => setGroupUrl(e.target.value)}
            placeholder="https://www.facebook.com/groups/123456789"
            className="shopify-input"
            required
          />
          <p className="text-xs text-muted-foreground">Enter the full URL of the Facebook group</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="group-name">Group Name (Optional)</Label>
          <Input
            id="group-name"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="My Facebook Group"
            className="shopify-input"
          />
          <p className="text-xs text-muted-foreground">
            Enter a custom name for this group or leave blank to use default
          </p>
        </div>

        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            disabled={isSubmitting || currentCount >= maxGroups}
            className="bg-blue-600 hover:bg-blue-700 text-white shopify-button"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Add Group
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
