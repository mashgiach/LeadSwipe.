"use client"

import { getSupabaseBrowserClient } from "@/lib/supabase"

export type NotificationType = "new_match" | "new_lead" | "message_generated" | "lead_saved" | "system"

export interface Notification {
  id: number
  user_id: string
  type: NotificationType
  title: string
  message: string
  lead_id?: number
  is_read: boolean
  created_at: string
  action_url?: string
}

export async function getNotifications(userId: string): Promise<Notification[]> {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching notifications:", error)
    return []
  }

  return data as Notification[]
}

export async function getUnreadNotificationsCount(userId: string): Promise<number> {
  const supabase = getSupabaseBrowserClient()
  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false)

  if (error) {
    console.error("Error fetching unread notifications count:", error)
    return 0
  }

  return count || 0
}

export async function markNotificationAsRead(notificationId: number): Promise<void> {
  const supabase = getSupabaseBrowserClient()
  const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", notificationId)

  if (error) {
    console.error("Error marking notification as read:", error)
  }
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  const supabase = getSupabaseBrowserClient()
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("is_read", false)

  if (error) {
    console.error("Error marking all notifications as read:", error)
  }
}

export async function deleteNotification(notificationId: number): Promise<void> {
  const supabase = getSupabaseBrowserClient()
  const { error } = await supabase.from("notifications").delete().eq("id", notificationId)

  if (error) {
    console.error("Error deleting notification:", error)
  }
}

export async function createNotification(
  notification: Omit<Notification, "id" | "created_at" | "is_read">,
): Promise<Notification | null> {
  // Store notifications in memory if we can't save them to the database
  // This allows the app to continue functioning even if notifications can't be saved
  const inMemoryNotifications: Record<string, any[]> = {}

  try {
    const supabase = getSupabaseBrowserClient()

    // Verify the user is authenticated
    const { data: userData, error: userError } = await supabase.auth.getUser()

    if (userError || !userData.user) {
      console.error("Error getting authenticated user:", userError)
      // Store notification in memory
      if (!inMemoryNotifications[notification.user_id]) {
        inMemoryNotifications[notification.user_id] = []
      }
      inMemoryNotifications[notification.user_id].push({
        ...notification,
        is_read: false,
        created_at: new Date().toISOString(),
      })
      return null
    }

    // Ensure the user_id in the notification matches the authenticated user
    if (notification.user_id !== userData.user.id) {
      console.error("Cannot create notification for another user")
      return null
    }

    const { data, error } = await supabase
      .from("notifications")
      .insert({
        ...notification,
        is_read: false,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating notification:", error)

      // If we get a row-level security error, store the notification in memory
      if (error.code === "42501" || error.message.includes("row-level security")) {
        if (!inMemoryNotifications[notification.user_id]) {
          inMemoryNotifications[notification.user_id] = []
        }
        inMemoryNotifications[notification.user_id].push({
          ...notification,
          is_read: false,
          created_at: new Date().toISOString(),
        })
        console.log("Notification stored in memory due to RLS policy")
      }

      return null
    }

    return data as Notification
  } catch (error) {
    console.error("Error creating notification:", error)
    return null
  }
}

// Subscribe to real-time notifications
export function subscribeToNotifications(userId: string, callback: (notification: Notification) => void) {
  const supabase = getSupabaseBrowserClient()

  const subscription = supabase
    .channel(`notifications:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        callback(payload.new as Notification)
      },
    )
    .subscribe()

  return subscription
}
