"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import { Bell, MessageSquare, Star, Trash2, User, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  deleteNotification,
  markNotificationAsRead,
  type Notification,
  type NotificationType,
} from "@/services/notification-service"

interface NotificationsListProps {
  notifications: Notification[]
  isLoading: boolean
}

export function NotificationsList({ notifications, isLoading }: NotificationsListProps) {
  const router = useRouter()
  const [localNotifications, setLocalNotifications] = useState<Notification[]>(notifications)

  const handleNotificationClick = async (notification: Notification) => {
    await markNotificationAsRead(notification.id)

    // Navigate to the appropriate page based on notification type
    if (notification.action_url) {
      router.push(notification.action_url)
    } else if (notification.lead_id) {
      router.push(`/leads?highlight=${notification.lead_id}`)
    }
  }

  const handleDeleteNotification = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    await deleteNotification(id)
    setLocalNotifications(localNotifications.filter((n) => n.id !== id))
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

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between border-b border-border/30 bg-card p-4">
        <h1 className="text-2xl font-bold text-blue-700 dark:text-blue-400">Notifications</h1>
      </div>

      <div className="p-4 space-y-4 shopify-gradient">
        {localNotifications.length === 0 ? (
          <Card className="border-border/30 bg-card shadow-lg shopify-card">
            <CardContent className="pt-6 text-center">
              <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No notifications yet</p>
            </CardContent>
          </Card>
        ) : (
          localNotifications.map((notification) => (
            <Card
              key={notification.id}
              className={`border-border/30 bg-card shadow-sm cursor-pointer transition-all duration-200 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-800/50 shopify-card ${
                !notification.is_read ? "border-l-4 border-l-blue-600" : ""
              }`}
              onClick={() => handleNotificationClick(notification)}
            >
              <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between space-y-0">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div>
                    <CardTitle className="text-base">{notification.title}</CardTitle>
                    <CardDescription className="text-xs">
                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                    </CardDescription>
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
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-sm text-muted-foreground">{notification.message}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
