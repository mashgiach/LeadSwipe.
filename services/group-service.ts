"use client"

import { getSupabaseBrowserClient } from "@/lib/supabase"

export interface FacebookGroup {
  id: number
  user_id: string
  group_id: string
  group_name: string
  group_url: string
  created_at: string
}

export async function getUserGroups(userId: string): Promise<FacebookGroup[]> {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase
    .from("facebook_groups")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching user groups:", error)
    return []
  }

  return data as FacebookGroup[]
}

export async function addFacebookGroup(
  userId: string,
  groupData: { group_id: string; group_name: string; group_url: string },
): Promise<FacebookGroup | null> {
  const supabase = getSupabaseBrowserClient()

  // First check if user already has 10 groups
  const { count, error: countError } = await supabase
    .from("facebook_groups")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)

  if (countError) {
    console.error("Error counting user groups:", countError)
    throw new Error("Failed to check group count")
  }

  if (count && count >= 10) {
    throw new Error("Maximum of 10 groups allowed per user")
  }

  // Add the new group
  const { data, error } = await supabase
    .from("facebook_groups")
    .insert({
      user_id: userId,
      group_id: groupData.group_id,
      group_name: groupData.group_name,
      group_url: groupData.group_url,
    })
    .select()
    .single()

  if (error) {
    console.error("Error adding Facebook group:", error)
    if (error.code === "23505") {
      throw new Error("This group is already linked to your account")
    }
    throw new Error("Failed to add Facebook group")
  }

  return data as FacebookGroup
}

export async function removeFacebookGroup(userId: string, groupId: number): Promise<void> {
  const supabase = getSupabaseBrowserClient()
  const { error } = await supabase.from("facebook_groups").delete().eq("id", groupId).eq("user_id", userId)

  if (error) {
    console.error("Error removing Facebook group:", error)
    throw new Error("Failed to remove Facebook group")
  }
}

export async function getGroupLeads(userId: string, groupIds: string[]): Promise<number[]> {
  const supabase = getSupabaseBrowserClient()

  if (groupIds.length === 0) {
    return []
  }

  // Get leads that belong to any of the user's linked groups
  const { data, error } = await supabase.from("leads").select("id").in("group_id", groupIds)

  if (error) {
    console.error("Error fetching group leads:", error)
    return []
  }

  return data.map((lead) => lead.id)
}

// Helper function to extract Facebook group ID from URL
export function extractFacebookGroupId(url: string): string | null {
  // Match patterns like:
  // https://www.facebook.com/groups/123456789/
  // https://facebook.com/groups/123456789
  // https://m.facebook.com/groups/123456789
  const regex = /facebook\.com\/groups\/([^/?]+)/i
  const match = url.match(regex)

  return match ? match[1] : null
}
