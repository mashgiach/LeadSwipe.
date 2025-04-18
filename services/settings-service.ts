"use client"

import { getSupabaseBrowserClient } from "@/lib/supabase"

export interface Settings {
  id?: number
  user_id: string
  groq_api_key?: string
  ai_model: string
  system_message?: string
  created_at?: string
  updated_at?: string
}

export async function getSettings(userId: string): Promise<Settings | null> {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase.from("settings").select("*").eq("user_id", userId).single()

  if (error && error.code !== "PGRST116") {
    // PGRST116 is the error code for "no rows returned"
    console.error("Error fetching settings:", error)
    return null
  }

  return data as Settings | null
}

export async function updateSettings(
  userId: string,
  settings: { groq_api_key?: string; ai_model?: string; system_message?: string },
): Promise<Settings> {
  const supabase = getSupabaseBrowserClient()

  const updatedSettings = {
    user_id: userId,
    ...settings,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from("settings")
    .upsert(updatedSettings, { onConflict: "user_id" })
    .select()
    .single()

  if (error) {
    console.error("Error updating settings:", error)
    throw new Error("Failed to update settings")
  }

  return data as Settings
}
