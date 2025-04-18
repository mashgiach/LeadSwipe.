import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import type { Database } from "@/lib/database.types"

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient<Database>({ cookies })

  try {
    // Check if user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized. Please log in to delete your account." }, { status: 401 })
    }

    // Create a service role client to perform admin operations
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      return NextResponse.json({ error: "Server configuration error. Please contact support." }, { status: 500 })
    }

    const adminClient = createRouteHandlerClient<Database>(
      {
        cookies,
      },
      {
        supabaseKey: serviceRoleKey,
      },
    )

    // Delete user data from related tables
    // Use transactions to ensure all operations succeed or fail together
    const { error: dataDeleteError } = await adminClient.rpc("delete_user_data", {
      user_id: user.id,
    })

    if (dataDeleteError) {
      console.error("Error deleting user data:", dataDeleteError)
      return NextResponse.json({ error: "Failed to delete user data. Please try again." }, { status: 500 })
    }

    // Delete the user account
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id)

    if (deleteError) {
      console.error("Error deleting user account:", deleteError)
      return NextResponse.json({ error: "Failed to delete user account. Please try again." }, { status: 500 })
    }

    // Sign out the user
    await supabase.auth.signOut()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Unexpected error in delete user account:", error)
    return NextResponse.json({ error: "An unexpected error occurred. Please try again." }, { status: 500 })
  }
}
