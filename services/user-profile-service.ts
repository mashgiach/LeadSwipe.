"use client"

import { getSupabaseBrowserClient } from "@/lib/supabase"

export interface UserProfile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const supabase = getSupabaseBrowserClient()

  // First check if the profile exists
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId)

  if (error) {
    console.error("Error fetching user profile:", error)
    return null
  }

  // If no profile exists, create a default one
  if (!data || data.length === 0) {
    return createDefaultProfile(userId)
  }

  // If multiple profiles exist, use the most recent one
  if (data.length > 1) {
    console.warn("Multiple profiles found for user, using the most recent one")
    // Sort by updated_at in descending order and take the first one
    return data.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0] as UserProfile
  }

  return data[0] as UserProfile
}

export async function updateProfile(
  userId: string,
  profile: Partial<Pick<UserProfile, "full_name" | "avatar_url">>,
): Promise<UserProfile | null> {
  const supabase = getSupabaseBrowserClient()

  // First get the current profile to ensure we have the email
  const currentProfile = await getUserProfile(userId)

  // If we can't get the current profile, try to get the email from auth
  if (!currentProfile) {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData?.user?.email) {
      console.error("Cannot update profile: No email available")
      return null
    }
  }

  const email = currentProfile?.email || (await supabase.auth.getUser()).data.user?.email || ""

  const updates = {
    ...profile,
    id: userId,
    email: email, // Include the email to satisfy the not-null constraint
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase.from("profiles").upsert(updates).select().single()

  if (error) {
    console.error("Error updating profile:", error)
    return null
  }

  return data as UserProfile
}

async function createDefaultProfile(userId: string): Promise<UserProfile | null> {
  const supabase = getSupabaseBrowserClient()

  // Get user email from auth.users if available
  const { data: userData } = await supabase.auth.getUser()
  const email = userData?.user?.email || ""

  if (!email) {
    console.error("Cannot create profile: No email available")
    return null
  }

  const defaultProfile = {
    id: userId,
    email,
    full_name: null,
    avatar_url: null,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase.from("profiles").upsert(defaultProfile).select().single()

  if (error) {
    console.error("Error creating default profile:", error)
    return null
  }

  return data as UserProfile
}
