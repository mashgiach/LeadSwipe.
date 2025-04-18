"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import { Bell, MessageSquare, Star, Trash2, User, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  getNotifications,
  markNotificationAsRead,
  deleteNotification,
  subscribeToNotifications,
  type Notification,
  type NotificationType,
} from "@/services/notification-service"

interface NotificationsContentProps {
  userId?: string
  setUnreadCount: (count: number) => void
  onClose: () => void
}

export function NotificationsContent({ userId, setUnreadCount, onClose }: NotificationsContentProps) {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!userId) return

      setIsLoading(true)
      try {
        const userNotifications = await getNotifications(userId)
        setNotifications(userNotifications)
      } catch (error) {
        console.error("Error fetching notifications:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchNotifications()

    // Set up real-time subscription for new notifications
    let subscription: { unsubscribe: () => void } | null = null

    if (userId) {
      subscription = subscribeToNotifications(userId, (newNotification) => {
        setNotifications((prev) => [newNotification, ...prev])
        setUnreadCount((prev) => prev + 1)
      })
    }

    return () => {
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [userId, setUnreadCount])

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await markNotificationAsRead(notification.id)
      setNotifications(notifications.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n)))
      setUnreadCount((prev) => Math.max(0, prev - 1))
    }

    // Navigate to the appropriate page based on notification type
    if (notification.action_url) {
      router.push(notification.action_url)
    } else if (notification.lead_id) {
      router.push(`/leads?highlight=${notification.lead_id}`)
    }

    onClose()
  }

  const handleDeleteNotification = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await deleteNotification(id)

      // Update unread count if the deleted notification was unread
      const deletedNotification = notifications.find((n) => n.id === id)
      if (deletedNotification && !deletedNotification.is_read) {
        setUnreadCount((prev) => Math.max(0, prev - 1))
      }

      setNotifications(notifications.filter((n) => n.id !== id))
    } catch (error) {
      console.error("Error deleting notification:", error)
    }
  }

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case "new_match":
        return <Users className="h-5 w-5 text-green-500" />
      case "new_lead":
        return <User className="h-5 w-5 text-blue-500" />
      case "message_generated":
        return <MessageSquare className="h-5 w-5 text-purple-500" />
      case "lead_saved":
        return <Star className="h-5 w-5 text-amber-500" />
      case "system":
      default:
        return <Bell className="h-5 w-5 text-primary" />
    }
  }

  return (
    <ScrollArea className="h-[400px]">
      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
          <Bell className="h-12 w-12 text-muted-foreground mb-2" />
          <p className="text-muted-foreground">No notifications yet</p>
        </div>
      ) : (
        <div className="divide-y divide-border/30">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 cursor-pointer hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors ${
                !notification.is_read ? "border-l-4 border-l-blue-600" : ""
              }`}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div>
                    <h4 className="text-sm font-medium">{notification.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">{notification.message}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={(e) => handleDeleteNotification(notification.id, e)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </ScrollArea>
  )
}
