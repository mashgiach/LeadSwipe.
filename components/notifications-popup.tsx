"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import { Bell, MessageSquare, Star, Trash2, User, Users, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useAuth } from "@/contexts/auth-context"
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  type Notification,
  type NotificationType,
} from "@/services/notification-service"

interface NotificationsPopupProps {
  unreadCount: number
  setUnreadCount: (count: number) => void
}

export function NotificationsPopup({ unreadCount, setUnreadCount }: NotificationsPopupProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user || !open) return

      setIsLoading(true)
      try {
        const userNotifications = await getNotifications(user.id)
        setNotifications(userNotifications)
      } catch (error) {
        console.error("Error fetching notifications:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchNotifications()
  }, [user, open])

  const handleOpenChange = async (isOpen: boolean) => {
    setOpen(isOpen)

    // Mark all as read when opening the popup
    if (isOpen && user && unreadCount > 0) {
      try {
        await markAllNotificationsAsRead(user.id)
        setNotifications(notifications.map((n) => ({ ...n, is_read: true })))
        setUnreadCount(0)
      } catch (error) {
        console.error("Error marking notifications as read:", error)
      }
    }
  }

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await markNotificationAsRead(notification.id)
      setNotifications(notifications.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n)))
      setUnreadCount(Math.max(0, unreadCount - 1))
    }

    // Navigate to the appropriate page based on notification type
    if (notification.action_url) {
      router.push(notification.action_url)
    } else if (notification.lead_id) {
      router.push(`/leads?highlight=${notification.lead_id}`)
    }

    setOpen(false)
  }

  const handleDeleteNotification = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await deleteNotification(id)
      setNotifications(notifications.filter((n) => n.id !== id))

      // Update unread count if the deleted notification was unread
      const deletedNotification = notifications.find((n) => n.id === id)
      if (deletedNotification && !deletedNotification.is_read) {
        setUnreadCount(Math.max(0, unreadCount - 1))
      }
    } catch (error) {
      console.error("Error deleting notification:", error)
    }
  }

  const handleMarkAllAsRead = async () => {
    if (!user) return

    try {
      await markAllNotificationsAsRead(user.id)
      setNotifications(notifications.map((n) => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error("Error marking all notifications as read:", error)
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md md:max-w-lg border-border/30 bg-card shadow-lg shopify-card p-0">
        <div className="flex items-center justify-between border-b border-border/30 p-4">
          <h3 className="font-semibold text-blue-700 dark:text-blue-400">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs flex items-center gap-1 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-900/20 dark:hover:text-blue-400"
              onClick={handleMarkAllAsRead}
            >
              <Check className="h-3 w-3" />
              Mark all as read
            </Button>
          )}
        </div>

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
      </DialogContent>
    </Dialog>
  )
}
