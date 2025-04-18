"use client"

import { getSupabaseBrowserClient } from "@/lib/supabase"
import { createNotification } from "@/services/notification-service"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { Database } from "@/lib/database.types"

export interface Lead {
  id: number
  name: string
  position: string
  location: string
  description: string
  employees: string
  industry: string
  tags: string[]
  image_url: string
  logo_url: string
  email?: string
  first_name?: string
  last_name?: string
  post_id?: string
  post_text?: string
  post_author?: string
  post_author_id?: string
  post_author_url?: string
  comment_id?: string
  comment_text?: string
  comment_author_name?: string
  comment_author_id?: string
  comment_author_url?: string
  timestamp?: string
  comment_url?: string
  ai_verified?: boolean
  group_id?: string
  group_name?: string
  phone?: string
  interests?: string[]
  profile_url?: string
  profile_image?: string
  notes?: string
}

export interface BlockedLead {
  id: number
  user_id: string
  lead_id: number
  blocked_at: string
  reason?: string
  lead?: Lead
}

export interface PaginatedResponse<T> {
  data: T[]
  count: number
  hasMore: boolean
}

// Add these new functions for paginated fetching
export interface PaginatedResponse<T> {
  data: T[]
  count: number
}

export async function getPaginatedLeads(
  page = 1,
  pageSize = 10,
  filters: { search?: string; keywords?: string[] } = {},
): Promise<PaginatedResponse<Lead>> {
  const supabase = getSupabaseBrowserClient()

  try {
    // First check if there are any leads at all
    const { count: totalCount, error: countError } = await supabase
      .from("leads")
      .select("*", { count: "exact", head: true })

    if (countError) {
      console.error("Error counting leads:", countError)
      return { data: [], count: 0 }
    }

    // If there are no leads, return empty result
    if (totalCount === 0) {
      return { data: [], count: 0 }
    }

    // Start building the query
    let query = supabase.from("leads").select("*", { count: "exact" })

    // Apply search filter if provided
    if (filters.search) {
      const searchTerm = `%${filters.search}%`
      query = query.or(
        `name.ilike.${searchTerm},first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},email.ilike.${searchTerm},description.ilike.${searchTerm}`,
      )
    }

    // Calculate safe pagination values
    const safePageSize = Math.max(1, pageSize)
    const safePage = Math.max(1, page)
    const from = (safePage - 1) * safePageSize

    // Make sure we don't request beyond the total count
    if (from >= totalCount) {
      // If the requested page is beyond available data, return the last page
      const lastPage = Math.ceil(totalCount / safePageSize) || 1
      const newFrom = (lastPage - 1) * safePageSize
      query = query.range(newFrom, newFrom + safePageSize - 1)
    } else {
      // Apply pagination with the calculated range
      query = query.range(from, from + safePageSize - 1)
    }

    // Execute the query
    const { data, error, count } = await query

    if (error) {
      console.error("Error fetching paginated leads:", error)
      return { data: [], count: 0 }
    }

    // Apply keyword filtering client-side (since it's more complex)
    let filteredData = data as Lead[]

    if (filters.keywords && filters.keywords.length > 0) {
      filteredData = filteredData.filter((lead) => {
        const content = [
          lead.name,
          lead.first_name,
          lead.last_name,
          lead.email,
          lead.comment_text,
          lead.post_text,
          lead.description,
          lead.industry,
          ...(lead.tags || []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()

        return filters.keywords!.some((keyword) => content.includes(keyword.toLowerCase()))
      })
    }

    return {
      data: filteredData,
      count: count || 0,
    }
  } catch (error) {
    console.error("Unexpected error in getPaginatedLeads:", error)
    return { data: [], count: 0 }
  }
}

export async function getPaginatedMatchedLeads(
  userId: string,
  page = 1,
  pageSize = 10,
  filters: { search?: string; keywords?: string[] } = {},
): Promise<PaginatedResponse<Lead>> {
  const supabase = getSupabaseBrowserClient()

  try {
    // First get the matched lead IDs
    const { data: matchedData, error: matchedError } = await supabase
      .from("matched_leads")
      .select("lead_id")
      .eq("user_id", userId)

    if (matchedError) {
      console.error("Error fetching matched lead IDs:", matchedError)
      return { data: [], count: 0 }
    }

    if (!matchedData || matchedData.length === 0) {
      return { data: [], count: 0 }
    }

    const matchedIds = matchedData.map((item) => item.lead_id)

    // Start building the query for leads
    let query = supabase.from("leads").select("*", { count: "exact" }).in("id", matchedIds)

    // Apply search filter if provided
    if (filters.search) {
      const searchTerm = `%${filters.search}%`
      query = query.or(
        `name.ilike.${searchTerm},first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},email.ilike.${searchTerm},description.ilike.${searchTerm}`,
      )
    }

    // Calculate safe pagination values
    const safePageSize = Math.max(1, pageSize)
    const safePage = Math.max(1, page)
    const from = (safePage - 1) * safePageSize
    const to = from + safePageSize - 1

    // Apply pagination
    query = query.range(from, to)

    // Execute the query
    const { data, error, count } = await query

    if (error) {
      // If range error, try fetching first page instead
      if (error.message.includes("range")) {
        const fallbackQuery = supabase
          .from("leads")
          .select("*", { count: "exact" })
          .in("id", matchedIds)
          .range(0, safePageSize - 1)

        const fallbackResult = await fallbackQuery

        if (fallbackResult.error) {
          console.error("Error fetching paginated matched leads (fallback):", fallbackResult.error)
          return { data: [], count: 0 }
        }

        return {
          data: fallbackResult.data as Lead[],
          count: fallbackResult.count || 0,
        }
      }

      console.error("Error fetching paginated matched leads:", error)
      return { data: [], count: 0 }
    }

    // Apply keyword filtering client-side (since it's more complex)
    let filteredData = data as Lead[]

    if (filters.keywords && filters.keywords.length > 0) {
      filteredData = filteredData.filter((lead) => {
        const content = [
          lead.name,
          lead.first_name,
          lead.last_name,
          lead.email,
          lead.comment_text,
          lead.post_text,
          lead.description,
          lead.industry,
          ...(lead.tags || []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()

        return filters.keywords!.some((keyword) => content.includes(keyword.toLowerCase()))
      })
    }

    return {
      data: filteredData,
      count: count || 0,
    }
  } catch (error) {
    console.error("Unexpected error in getPaginatedMatchedLeads:", error)
    return { data: [], count: 0 }
  }
}

export async function getPaginatedArchivedLeads(
  userId: string,
  page = 1,
  pageSize = 10,
): Promise<PaginatedResponse<Lead>> {
  const supabase = getSupabaseBrowserClient()

  try {
    // First get the archived lead IDs
    const { data: archivedData, error: archivedError } = await supabase
      .from("archived_leads")
      .select("lead_id")
      .eq("user_id", userId)

    if (archivedError) {
      console.error("Error fetching archived lead IDs:", archivedError)
      return { data: [], count: 0 }
    }

    if (!archivedData || archivedData.length === 0) {
      return { data: [], count: 0 }
    }

    const archivedIds = archivedData.map((item) => item.lead_id)

    // Calculate safe pagination values
    const safePageSize = Math.max(1, pageSize)
    const safePage = Math.max(1, page)
    const from = (safePage - 1) * safePageSize
    const to = from + safePageSize - 1

    // Get the leads with pagination
    const { data, error, count } = await supabase
      .from("leads")
      .select("*", { count: "exact" })
      .in("id", archivedIds)
      .range(from, to)

    if (error) {
      // If range error, try fetching first page instead
      if (error.message.includes("range")) {
        const fallbackQuery = supabase
          .from("leads")
          .select("*", { count: "exact" })
          .in("id", archivedIds)
          .range(0, safePageSize - 1)

        const fallbackResult = await fallbackQuery

        if (fallbackResult.error) {
          console.error("Error fetching paginated archived leads (fallback):", fallbackResult.error)
          return { data: [], count: 0 }
        }

        return {
          data: fallbackResult.data as Lead[],
          count: fallbackResult.count || 0,
        }
      }

      console.error("Error fetching paginated archived leads:", error)
      return { data: [], count: 0 }
    }

    return {
      data: data as Lead[],
      count: count || 0,
    }
  } catch (error) {
    console.error("Unexpected error in getPaginatedArchivedLeads:", error)
    return { data: [], count: 0 }
  }
}

export async function getLeads(page = 1, pageSize = 10, groupId?: string | null, searchTerm?: string) {
  const supabase = getSupabaseBrowserClient()

  try {
    // Calculate the range for pagination
    const safePageSize = Math.max(1, pageSize)
    const safePage = Math.max(1, page)
    const from = (safePage - 1) * safePageSize
    const to = from + safePageSize - 1

    // Start building the query
    let query = supabase.from("leads").select("*", { count: "exact" })

    // Add group filter if provided
    if (groupId) {
      query = query.eq("group_id", groupId)
    }

    // Add search filter if provided
    if (searchTerm) {
      const searchPattern = `%${searchTerm}%`
      query = query.or(
        `name.ilike.${searchPattern},first_name.ilike.${searchPattern},last_name.ilike.${searchPattern},email.ilike.${searchPattern},post_text.ilike.${searchPattern},comment_text.ilike.${searchPattern}`,
      )
    }

    // First check if there are any leads with the applied filters
    const countQuery = supabase.from("leads").select("*", { count: "exact", head: true })
    if (groupId) {
      countQuery.eq("group_id", groupId)
    }
    if (searchTerm) {
      const searchPattern = `%${searchTerm}%`
      countQuery.or(
        `name.ilike.${searchPattern},first_name.ilike.${searchPattern},last_name.ilike.${searchPattern},email.ilike.${searchPattern},post_text.ilike.${searchPattern},comment_text.ilike.${searchPattern}`,
      )
    }

    const { count: totalCount, error: countError } = await countQuery

    if (countError) {
      console.error("Error counting leads:", countError)
      return { leads: [], count: 0, error: countError }
    }

    // If there are no leads, return empty result
    if (totalCount === 0) {
      return { leads: [], count: 0, totalPages: 0 }
    }

    // Make sure we don't request beyond the total count
    let actualFrom = from
    if (from >= totalCount) {
      // If the requested page is beyond available data, return the last page
      const lastPage = Math.ceil(totalCount / safePageSize) || 1
      actualFrom = (lastPage - 1) * safePageSize
    }

    // Complete the query with pagination and ordering
    query = query.range(actualFrom, actualFrom + safePageSize - 1).order("created_at", { ascending: false })

    const { data, error, count } = await query

    if (error) {
      console.error("Error fetching leads:", error)
      return { leads: [], count: 0, error }
    }

    return {
      leads: data || [],
      count: count || 0,
      totalPages: count ? Math.ceil(count / safePageSize) : 0,
    }
  } catch (error) {
    console.error("Unexpected error in getLeads:", error)
    return { leads: [], count: 0, error }
  }
}

export async function getSavedLeads(page = 1, pageSize = 10) {
  const supabase = createClientComponentClient<Database>()

  try {
    const safePageSize = Math.max(1, pageSize)
    const safePage = Math.max(1, page)
    const from = (safePage - 1) * safePageSize
    const to = from + safePageSize - 1

    // First check if there are any saved leads
    const { count: totalCount, error: countError } = await supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("saved", true)

    if (countError) {
      console.error("Error counting saved leads:", countError)
      return { leads: [], count: 0, error: countError }
    }

    // If there are no saved leads, return empty result
    if (totalCount === 0) {
      return { leads: [], count: 0, totalPages: 0 }
    }

    // Make sure we don't request beyond the total count
    let actualFrom = from
    if (from >= totalCount) {
      // If the requested page is beyond available data, return the last page
      const lastPage = Math.ceil(totalCount / safePageSize) || 1
      actualFrom = (lastPage - 1) * safePageSize
    }

    const { data, error, count } = await supabase
      .from("leads")
      .select("*", { count: "exact" })
      .eq("saved", true)
      .range(actualFrom, actualFrom + safePageSize - 1)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching saved leads:", error)
      return { leads: [], count: 0, error }
    }

    return {
      leads: data || [],
      count: count || 0,
      totalPages: count ? Math.ceil(count / safePageSize) : 0,
    }
  } catch (error) {
    console.error("Unexpected error in getSavedLeads:", error)
    return { leads: [], count: 0, error }
  }
}

// Replace the getBlockedLeads function with this corrected version:
export async function getBlockedLeads(userId: string): Promise<BlockedLead[]> {
  const supabase = getSupabaseBrowserClient()

  try {
    // First get the blocked lead entries
    const { data: blockedData, error: blockedError } = await supabase
      .from("blocked_leads")
      .select("*")
      .eq("user_id", userId)

    if (blockedError) {
      console.error("Error fetching blocked leads:", blockedError)
      return []
    }

    if (!blockedData || blockedData.length === 0) {
      return []
    }

    // Extract the lead IDs
    const leadIds = blockedData.map((item) => item.lead_id)

    // Then fetch the actual lead data
    const { data: leadsData, error: leadsError } = await supabase.from("leads").select("*").in("id", leadIds)

    if (leadsError) {
      console.error("Error fetching lead details for blocked leads:", leadsError)
      return []
    }

    // Create a map of lead IDs to lead data for easy lookup
    const leadsMap = new Map(leadsData.map((lead) => [lead.id, lead]))

    // Combine the data to create BlockedLead objects
    return blockedData
      .map((blockedItem) => {
        const lead = leadsMap.get(blockedItem.lead_id)
        return {
          id: blockedItem.id,
          user_id: blockedItem.user_id,
          lead_id: blockedItem.lead_id,
          blocked_at: blockedItem.blocked_at,
          reason: blockedItem.reason,
          lead: lead || null,
        }
      })
      .filter((item) => item.lead !== null) // Filter out any blocked leads where we couldn't find the lead data
  } catch (error) {
    console.error("Unexpected error in getBlockedLeads:", error)
    return []
  }
}

// Rename the pagination version to avoid conflicts
export async function getPaginatedBlockedLeads(page = 1, pageSize = 10) {
  const supabase = createClientComponentClient<Database>()

  try {
    const safePageSize = Math.max(1, pageSize)
    const safePage = Math.max(1, page)
    const from = (safePage - 1) * safePageSize
    const to = from + safePageSize - 1

    // First check if there are any blocked leads
    const { count: totalCount, error: countError } = await supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("blocked", true)

    if (countError) {
      console.error("Error counting blocked leads:", countError)
      return { leads: [], count: 0, error: countError }
    }

    // If there are no blocked leads, return empty result
    if (totalCount === 0) {
      return { leads: [], count: 0, totalPages: 0 }
    }

    // Make sure we don't request beyond the total count
    let actualFrom = from
    if (from >= totalCount) {
      // If the requested page is beyond available data, return the last page
      const lastPage = Math.ceil(totalCount / safePageSize) || 1
      actualFrom = (lastPage - 1) * safePageSize
    }

    const { data, error, count } = await supabase
      .from("leads")
      .select("*", { count: "exact" })
      .eq("blocked", true)
      .range(actualFrom, actualFrom + safePageSize - 1)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching blocked leads:", error)
      return { leads: [], count: 0, error }
    }

    return {
      leads: data || [],
      count: count || 0,
      totalPages: count ? Math.ceil(count / safePageSize) : 0,
    }
  } catch (error) {
    console.error("Unexpected error in getPaginatedBlockedLeads:", error)
    return { leads: [], count: 0, error }
  }
}

// Get leads for the swiper (filtered by viewed, blocked, archived)
export async function getLeadsForSwiper(
  userId: string,
  viewedIds: number[],
  blockedIds: number[],
  archivedIds: number[],
  page = 1,
  pageSize = 10,
): Promise<PaginatedResponse<Lead>> {
  const supabase = getSupabaseBrowserClient()

  try {
    // Calculate range for pagination
    const safePageSize = Math.max(1, pageSize)
    const safePage = Math.max(1, page)
    const from = (safePage - 1) * safePageSize
    const to = from + safePageSize - 1

    // Build query with filters
    let query = supabase.from("leads").select("*", { count: "exact" })

    // Filter out viewed, blocked, and archived leads
    const excludeIds = [...new Set([...viewedIds, ...blockedIds, ...archivedIds])]
    if (excludeIds.length > 0) {
      query = query.not("id", "in", `(${excludeIds.join(",")})`)
    }

    // First check total count with these filters
    const countQuery = supabase.from("leads").select("*", { count: "exact", head: true })
    if (excludeIds.length > 0) {
      countQuery.not("id", "in", `(${excludeIds.join(",")})`)
    }

    const { count: totalCount, error: countError } = await countQuery

    if (countError) {
      console.error("Error counting leads for swiper:", countError)
      return { data: [], count: 0, hasMore: false }
    }

    // If no leads match the filters, return empty result
    if (totalCount === 0) {
      return { data: [], count: 0, hasMore: false }
    }

    // Make sure we don't request beyond the total count
    let actualFrom = from
    if (from >= totalCount) {
      // If the requested page is beyond available data, return the last page
      const lastPage = Math.ceil(totalCount / safePageSize) || 1
      actualFrom = (lastPage - 1) * safePageSize
    }

    // Apply pagination
    query = query.range(actualFrom, actualFrom + safePageSize - 1)

    const { data, error, count } = await query

    if (error) {
      console.error("Error fetching leads for swiper:", error)
      return { data: [], count: 0, hasMore: false }
    }

    return {
      data: data as Lead[],
      count: count || 0,
      hasMore: count ? actualFrom + safePageSize < count : false,
    }
  } catch (error) {
    console.error("Unexpected error in getLeadsForSwiper:", error)
    return { data: [], count: 0, hasMore: false }
  }
}

// Get leads for specific groups with pagination
export async function getLeadsByGroups(
  groupIds: string[],
  viewedIds: number[],
  blockedIds: number[],
  archivedIds: number[],
  page = 1,
  pageSize = 10,
): Promise<PaginatedResponse<Lead>> {
  if (groupIds.length === 0) return { data: [], count: 0, hasMore: false }

  const supabase = getSupabaseBrowserClient()

  try {
    // Calculate range for pagination
    const safePageSize = Math.max(1, pageSize)
    const safePage = Math.max(1, page)
    const from = (safePage - 1) * safePageSize
    const to = from + safePageSize - 1

    // Build query with filters
    let query = supabase.from("leads").select("*", { count: "exact" }).in("group_id", groupIds)

    // Filter out viewed, blocked, and archived leads
    const excludeIds = [...new Set([...viewedIds, ...blockedIds, ...archivedIds])]
    if (excludeIds.length > 0) {
      query = query.not("id", "in", `(${excludeIds.join(",")})`)
    }

    // First check total count with these filters
    const countQuery = supabase.from("leads").select("*", { count: "exact", head: true }).in("group_id", groupIds)

    if (excludeIds.length > 0) {
      countQuery.not("id", "in", `(${excludeIds.join(",")})`)
    }

    const { count: totalCount, error: countError } = await countQuery

    if (countError) {
      console.error("Error counting leads by groups:", countError)
      return { data: [], count: 0, hasMore: false }
    }

    // If no leads match the filters, return empty result
    if (totalCount === 0) {
      return { data: [], count: 0, hasMore: false }
    }

    // Make sure we don't request beyond the total count
    let actualFrom = from
    if (from >= totalCount) {
      // If the requested page is beyond available data, return the last page
      const lastPage = Math.ceil(totalCount / safePageSize) || 1
      actualFrom = (lastPage - 1) * safePageSize
    }

    // Apply pagination
    query = query.range(actualFrom, actualFrom + safePageSize - 1)

    const { data, error, count } = await query

    if (error) {
      console.error("Error fetching leads by groups:", error)
      return { data: [], count: 0, hasMore: false }
    }

    return {
      data: data as Lead[],
      count: count || 0,
      hasMore: count ? actualFrom + safePageSize < count : false,
    }
  } catch (error) {
    console.error("Unexpected error in getLeadsByGroups:", error)
    return { data: [], count: 0, hasMore: false }
  }
}

// Check the getMatchedLeads function to ensure it's correctly filtering for matched leads

// Get matched leads with pagination and variable page size
export async function getMatchedLeads(
  userId: string,
  page = 1,
  pageSize = 20,
  groupId?: string | null,
  searchTerm?: string,
): Promise<{ data: Lead[]; count: number; hasMore: boolean }> {
  const supabase = getSupabaseBrowserClient()

  try {
    // First get the matched lead IDs
    const { data: matchedData, error: matchedError } = await supabase
      .from("matched_leads")
      .select("lead_id")
      .eq("user_id", userId)

    if (matchedError) {
      console.error("Error fetching matched lead IDs:", matchedError)
      return { data: [], count: 0, hasMore: false }
    }

    if (!matchedData || matchedData.length === 0) {
      return { data: [], count: 0, hasMore: false }
    }

    const matchedIds = matchedData.map((item) => item.lead_id)

    // Calculate range for pagination
    const safePageSize = Math.max(1, pageSize)
    const safePage = Math.max(1, page)
    const from = (safePage - 1) * safePageSize

    // Start building the query
    let query = supabase.from("leads").select("*", { count: "exact" }).in("id", matchedIds)

    // Add group filter if provided
    if (groupId) {
      query = query.eq("group_id", groupId)
    }

    // Add search filter if provided
    if (searchTerm) {
      const searchPattern = `%${searchTerm}%`
      query = query.or(
        `name.ilike.${searchPattern},first_name.ilike.${searchPattern},last_name.ilike.${searchPattern},email.ilike.${searchPattern},post_text.ilike.${searchPattern},comment_text.ilike.${searchPattern}`,
      )
    }

    // First check total count with these filters
    const countQuery = supabase.from("leads").select("*", { count: "exact", head: true }).in("id", matchedIds)
    if (groupId) {
      countQuery.eq("group_id", groupId)
    }
    if (searchTerm) {
      const searchPattern = `%${searchTerm}%`
      countQuery.or(
        `name.ilike.${searchPattern},first_name.ilike.${searchPattern},last_name.ilike.${searchPattern},email.ilike.${searchPattern},post_text.ilike.${searchPattern},comment_text.ilike.${searchPattern}`,
      )
    }

    const { count: totalCount, error: countError } = await countQuery

    if (countError) {
      console.error("Error counting matched leads:", countError)
      return { data: [], count: 0, hasMore: false }
    }

    // If no leads match the filters, return empty result
    if (totalCount === 0) {
      return { data: [], count: 0, hasMore: false }
    }

    // Make sure we don't request beyond the total count
    let actualFrom = from
    if (from >= totalCount) {
      // If the requested page is beyond available data, return the last page
      const lastPage = Math.ceil(totalCount / safePageSize) || 1
      actualFrom = (lastPage - 1) * safePageSize
    }

    // Then fetch the actual lead data with pagination
    const { data: leadsData, error: leadsError, count } = await query.range(actualFrom, actualFrom + safePageSize - 1)

    if (leadsError) {
      console.error("Error fetching matched leads data:", leadsError)
      return { data: [], count: 0, hasMore: false }
    }

    return {
      data: leadsData as Lead[],
      count: count || 0,
      hasMore: count ? actualFrom + safePageSize < count : false,
    }
  } catch (error) {
    console.error("Unexpected error in getMatchedLeads:", error)
    return { data: [], count: 0, hasMore: false }
  }
}

// The rest of the file remains unchanged
export async function getViewedLeadIds(userId: string): Promise<number[]> {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase.from("viewed_leads").select("lead_id").eq("user_id", userId)

  if (error) {
    console.error("Error fetching viewed leads:", error)
    return []
  }

  return data.map((item) => item.lead_id)
}

export async function getBlockedLeadIds(userId: string): Promise<number[]> {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase.from("blocked_leads").select("lead_id").eq("user_id", userId)

  if (error) {
    console.error("Error fetching blocked leads:", error)
    return []
  }

  return data.map((item) => item.lead_id)
}

export async function saveLead(userId: string, leadId: number) {
  const supabase = getSupabaseBrowserClient()

  try {
    const { error } = await supabase
      .from("saved_leads")
      .upsert({ user_id: userId, lead_id: leadId }, { onConflict: "user_id,lead_id", ignoreDuplicates: true })

    if (error) {
      console.error("Error saving lead:", error)
      return { success: false, error }
    }

    return { success: true }
  } catch (error) {
    console.error("Unexpected error in saveLead:", error)
    return { success: false, error }
  }
}

export async function blockLead(userId: string, leadId: number) {
  const supabase = getSupabaseBrowserClient()

  try {
    const { error } = await supabase
      .from("blocked_leads")
      .upsert({ user_id: userId, lead_id: leadId }, { onConflict: "user_id,lead_id", ignoreDuplicates: true })

    if (error) {
      console.error("Error blocking lead:", error)
      return { success: false, error }
    }

    return { success: true }
  } catch (error) {
    console.error("Unexpected error in blockLead:", error)
    return { success: false, error }
  }
}

export async function unblockLead(userId: string, leadId: number) {
  const supabase = getSupabaseBrowserClient()

  try {
    const { error } = await supabase.from("blocked_leads").delete().eq("user_id", userId).eq("lead_id", leadId)

    if (error) {
      console.error("Error unblocking lead:", error)
      return { success: false, error }
    }

    return { success: true }
  } catch (error) {
    console.error("Unexpected error in unblockLead:", error)
    return { success: false, error }
  }
}

export async function unsaveLead(userId: string, leadId: number) {
  const supabase = getSupabaseBrowserClient()

  try {
    const { error } = await supabase.from("saved_leads").delete().eq("user_id", userId).eq("lead_id", leadId)

    if (error) {
      console.error("Error unsaving lead:", error)
      return { success: false, error }
    }

    return { success: true }
  } catch (error) {
    console.error("Unexpected error in unsaveLead:", error)
    return { success: false, error }
  }
}

// Update the markLeadAsViewed function to handle duplicate entries
export async function markLeadAsViewed(userId: string, leadId: number): Promise<void> {
  const supabase = getSupabaseBrowserClient()

  // Use upsert with onConflict option to handle duplicate entries
  const { error } = await supabase
    .from("viewed_leads")
    .upsert({ user_id: userId, lead_id: leadId }, { onConflict: "user_id,lead_id", ignoreDuplicates: true })

  if (error && error.code !== "23505") {
    // Ignore unique constraint violations
    console.error("Error marking lead as viewed:", error)
  }
}

export async function removeViewedLead(userId: string, leadId: number): Promise<void> {
  const supabase = getSupabaseBrowserClient()
  const { error } = await supabase.from("viewed_leads").delete().eq("user_id", userId).eq("lead_id", leadId)

  if (error) {
    console.error("Error removing viewed lead:", error)
    throw new Error("Failed to remove viewed lead")
  }
}

export async function getSavedLeadIds(userId: string): Promise<number[]> {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase.from("saved_leads").select("lead_id").eq("user_id", userId)

  if (error) {
    console.error("Error fetching saved leads:", error)
    return []
  }

  return data.map((item) => item.lead_id)
}

export async function matchLead(userId: string, leadId: number): Promise<void> {
  const supabase = getSupabaseBrowserClient()
  const { error } = await supabase
    .from("matched_leads")
    .upsert({ user_id: userId, lead_id: leadId }, { onConflict: "user_id,lead_id", ignoreDuplicates: true })

  if (error && error.code !== "23505") {
    console.error("Error matching lead:", error)
    return
  }

  // Get lead details for notification
  try {
    const { data: lead } = await supabase.from("leads").select("*").eq("id", leadId).single()

    if (lead) {
      const leadName = lead.first_name && lead.last_name ? `${lead.first_name} ${lead.last_name}` : lead.name

      // Create notification - but don't let it block the main functionality
      try {
        await createNotification({
          user_id: userId,
          type: "new_match",
          title: "New Match!",
          message: `You matched with ${leadName}. Start a conversation now!`,
          lead_id: leadId,
          action_url: "/",
        })
      } catch (notificationError) {
        console.log("Failed to create notification, but match was successful")
      }
    }
  } catch (error) {
    console.error("Error getting lead details:", error)
    // Match was still successful, so we don't throw an error
  }
}

export async function getMatchedLeadIds(userId: string): Promise<number[]> {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase.from("matched_leads").select("lead_id").eq("user_id", userId)

  if (error) {
    console.error("Error fetching matched leads:", error)
    return []
  }

  return data.map((item) => item.lead_id)
}

// Add the missing unmatchLead function to the lead service
export async function unmatchLead(userId: string, leadId: number): Promise<void> {
  const supabase = getSupabaseBrowserClient()
  const { error } = await supabase.from("matched_leads").delete().eq("user_id", userId).eq("lead_id", leadId)

  if (error) {
    console.error("Error unmatching lead:", error)
    throw new Error("Failed to unmatch lead")
  }
}

// Add the missing restoreArchivedLead function
export async function restoreArchivedLead(userId: string, leadId: number): Promise<void> {
  const supabase = getSupabaseBrowserClient()
  const { error } = await supabase.from("archived_leads").delete().eq("user_id", userId).eq("lead_id", leadId)

  if (error) {
    console.error("Error restoring archived lead:", error)
    throw new Error("Failed to restore archived lead")
  }
}

// Fixed archiveLead function to handle the type mismatch between UUID and integer
export async function archiveLead(userId: string, leadId: number): Promise<{ success: boolean; error?: any }> {
  const supabase = getSupabaseBrowserClient()

  try {
    // Check if the lead is already archived
    const { data: existingArchive } = await supabase
      .from("archived_leads")
      .select("*")
      .eq("user_id", userId)
      .eq("lead_id", leadId)
      .single()

    // If already archived, return success
    if (existingArchive) {
      return { success: true }
    }

    // Insert into archived_leads table with correct field structure
    const { error: archiveError } = await supabase.from("archived_leads").insert({
      user_id: userId,
      lead_id: leadId,
      archived_at: new Date().toISOString(),
    })

    if (archiveError) {
      console.error("Error archiving lead:", archiveError)
      return { success: false, error: archiveError }
    }

    return { success: true }
  } catch (error) {
    console.error("Unexpected error in archiveLead:", error)
    return { success: false, error }
  }
}

export async function getArchivedLeadIds(userId: string): Promise<number[]> {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase.from("archived_leads").select("lead_id").eq("user_id", userId)

  if (error) {
    console.error("Error fetching archived leads:", error)
    return []
  }

  return data ? data.map((item) => item.lead_id) : []
}

// Update the getArchivedLeads function to not rely on the non-existent lead_data column
// Replace the getArchivedLeads function with this corrected version:

export async function getArchivedLeads(userId: string, page = 1, pageSize = 20): Promise<PaginatedResponse<Lead>> {
  const supabase = getSupabaseBrowserClient()

  try {
    // First get the archived lead IDs
    const { data: archivedData, error: archivedError } = await supabase
      .from("archived_leads")
      .select("lead_id")
      .eq("user_id", userId)

    if (archivedError) {
      console.error("Error fetching archived lead IDs:", archivedError)
      return { data: [], count: 0, hasMore: false }
    }

    if (!archivedData || archivedData.length === 0) {
      return { data: [], count: 0, hasMore: false }
    }

    const archivedIds = archivedData.map((item) => item.lead_id)

    // Calculate range for pagination
    const safePageSize = Math.max(1, pageSize)
    const safePage = Math.max(1, page)
    const from = (safePage - 1) * safePageSize
    const to = from + safePageSize - 1

    // Then fetch the actual lead data with pagination
    const {
      data: leadsData,
      error: leadsError,
      count,
    } = await supabase.from("leads").select("*", { count: "exact" }).in("id", archivedIds).range(from, to)

    if (leadsError) {
      // If range error, try fetching first page instead
      if (leadsError.message.includes("range")) {
        const fallbackQuery = supabase
          .from("leads")
          .select("*", { count: "exact" })
          .in("id", archivedIds)
          .range(0, safePageSize - 1)

        const fallbackResult = await fallbackQuery

        if (fallbackResult.error) {
          console.error("Error fetching archived leads data (fallback):", fallbackResult.error)
          return { data: [], count: 0, hasMore: false }
        }

        return {
          data: fallbackResult.data as Lead[],
          count: fallbackResult.count || 0,
          hasMore: fallbackResult.count ? safePageSize < fallbackResult.count : false,
        }
      }

      console.error("Error fetching archived leads data:", leadsError)
      return { data: [], count: 0, hasMore: false }
    }

    return {
      data: leadsData as Lead[],
      count: count || 0,
      hasMore: count ? from + safePageSize < count : false,
    }
  } catch (error) {
    console.error("Unexpected error in getArchivedLeads:", error)
    return { data: [], count: 0, hasMore: false }
  }
}

// Export leads with various options
export async function exportLeads(options: {
  all?: boolean
  ids?: number[]
  filters?: Record<string, any>
  page?: number
  pageSize?: number
}): Promise<Lead[]> {
  const supabase = getSupabaseBrowserClient()
  let query = supabase.from("leads").select("*")

  // Apply filters based on options
  if (!options.all) {
    if (options.ids && options.ids.length > 0) {
      // Export only selected leads
      query = query.in("id", options.ids)
    } else if (options.filters) {
      // Apply custom filters
      Object.entries(options.filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value)
        }
      })

      // Apply pagination if not exporting all filtered results
      if (options.page !== undefined && options.pageSize !== undefined) {
        const from = (options.page - 1) * options.pageSize
        const to = from + options.pageSize - 1
        query = query.range(from, to)
      }
    }
  }

  const { data, error } = await query

  if (error) {
    console.error("Error exporting leads:", error)
    return []
  }

  return data as Lead[]
}
