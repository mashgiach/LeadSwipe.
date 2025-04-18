"use client"

import { getSupabaseBrowserClient } from "@/lib/supabase"

export interface UserSettings {
  id?: number
  user_id: string
  keywords: string[]
  notification_email: boolean
  notification_push: boolean
  theme: string
  created_at?: string
  updated_at?: string
}

export async function getUserSettings(userId: string): Promise<UserSettings | null> {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase.from("user_settings").select("*").eq("user_id", userId).single()

  if (error && error.code !== "PGRST116") {
    // PGRST116 is the error code for "no rows returned"
    console.error("Error fetching user settings:", error)
    return null
  }

  if (!data) {
    // Create default settings if none exist
    return createDefaultSettings(userId)
  }

  return data as UserSettings
}

export async function updateUserSettings(
  userId: string,
  settings: Partial<Omit<UserSettings, "id" | "user_id" | "created_at" | "updated_at">>,
): Promise<UserSettings | null> {
  const supabase = getSupabaseBrowserClient()

  const updatedSettings = {
    user_id: userId,
    ...settings,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from("user_settings")
    .upsert(updatedSettings, { onConflict: "user_id" })
    .select()
    .single()

  if (error) {
    console.error("Error updating user settings:", error)
    return null
  }

  return data as UserSettings
}

async function createDefaultSettings(userId: string): Promise<UserSettings | null> {
  const defaultSettings: Omit<UserSettings, "id" | "created_at" | "updated_at"> = {
    user_id: userId,
    keywords: [],
    notification_email: true,
    notification_push: true,
    theme: "light", // Changed from "dark" to "light"
  }

  return updateUserSettings(userId, defaultSettings)
}

export async function updateKeywords(userId: string, keywords: string[]): Promise<UserSettings | null> {
  return updateUserSettings(userId, { keywords })
}

export async function updateTheme(userId: string, theme: string): Promise<UserSettings | null> {
  return updateUserSettings(userId, { theme })
}
