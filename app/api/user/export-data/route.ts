import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import type { Database } from "@/lib/database.types"

export async function GET(request: Request) {
  const supabase = createRouteHandlerClient<Database>({ cookies })

  try {
    // Check if user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized. Please log in to export your data." }, { status: 401 })
    }

    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()

    if (profileError) {
      console.error("Error fetching user profile:", profileError)
    }

    // Fetch user's leads
    const { data: leads, error: leadsError } = await supabase.from("leads").select("*").eq("user_id", user.id)

    if (leadsError) {
      console.error("Error fetching user leads:", leadsError)
    }

    // Fetch user's matched leads
    const { data: matchedLeads, error: matchedLeadsError } = await supabase
      .from("matched_leads")
      .select("*")
      .eq("user_id", user.id)

    if (matchedLeadsError) {
      console.error("Error fetching matched leads:", matchedLeadsError)
    }

    // Fetch user's saved leads
    const { data: savedLeads, error: savedLeadsError } = await supabase
      .from("saved_leads")
      .select("*")
      .eq("user_id", user.id)

    if (savedLeadsError) {
      console.error("Error fetching saved leads:", savedLeadsError)
    }

    // Fetch user's blocked leads
    const { data: blockedLeads, error: blockedLeadsError } = await supabase
      .from("blocked_leads")
      .select("*")
      .eq("user_id", user.id)

    if (blockedLeadsError) {
      console.error("Error fetching blocked leads:", blockedLeadsError)
    }

    // Fetch user's settings
    const { data: settings, error: settingsError } = await supabase
      .from("user_settings")
      .select("*")
      .eq("user_id", user.id)

    if (settingsError) {
      console.error("Error fetching user settings:", settingsError)
    }

    // Fetch user's notifications
    const { data: notifications, error: notificationsError } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100)

    if (notificationsError) {
      console.error("Error fetching user notifications:", notificationsError)
    }

    // Compile all data
    const userData = {
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
      },
      profile: profile || null,
      settings: settings || null,
      leads: leads || [],
      matched_leads: matchedLeads || [],
      saved_leads: savedLeads || [],
      blocked_leads: blockedLeads || [],
      notifications: notifications || [],
    }

    // Return the data as JSON
    return new NextResponse(JSON.stringify(userData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="leadswipe-data-export-${new Date().toISOString().split("T")[0]}.json"`,
      },
    })
  } catch (error) {
    console.error("Error exporting user data:", error)
    return NextResponse.json({ error: "Failed to export data. Please try again." }, { status: 500 })
  }
}
