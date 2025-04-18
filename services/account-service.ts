import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { Database } from "@/lib/database.types"

export type SubscriptionPlan = "basic" | "plus" | "lux"

export interface PlanFeature {
  name: string
  included: boolean
  limit?: number | string
}

export interface SubscriptionPlanDetails {
  name: string
  description: string
  price: number
  features: PlanFeature[]
  recommended?: boolean
}

export const SUBSCRIPTION_PLANS: Record<SubscriptionPlan, SubscriptionPlanDetails> = {
  basic: {
    name: "Basic",
    description: "For individuals just getting started",
    price: 0,
    features: [
      { name: "Up to 100 leads", included: true },
      { name: "Basic lead management", included: true },
      { name: "Email notifications", included: true },
      { name: "AI message generation", included: false },
      { name: "Advanced analytics", included: false },
      { name: "Priority support", included: false },
    ],
  },
  plus: {
    name: "Plus",
    description: "For growing businesses",
    price: 19.99,
    recommended: true,
    features: [
      { name: "Up to 1,000 leads", included: true },
      { name: "Advanced lead management", included: true },
      { name: "Email & SMS notifications", included: true },
      { name: "AI message generation", included: true, limit: "50/month" },
      { name: "Basic analytics", included: true },
      { name: "Priority support", included: false },
    ],
  },
  lux: {
    name: "Lux",
    description: "For power users and teams",
    price: 49.99,
    features: [
      { name: "Unlimited leads", included: true },
      { name: "Advanced lead management", included: true },
      { name: "All notification channels", included: true },
      { name: "Unlimited AI message generation", included: true },
      { name: "Advanced analytics & reporting", included: true },
      { name: "24/7 Priority support", included: true },
    ],
  },
}

export async function getCurrentSubscription(): Promise<SubscriptionPlan> {
  // In a real app, this would fetch from your database
  // For now, we'll just return 'basic'
  return "basic"
}

export async function upgradeSubscription(plan: SubscriptionPlan): Promise<{ success: boolean; error?: any }> {
  // In a real app, this would handle payment processing and update the user's subscription
  console.log(`Upgrading to ${plan} plan`)
  return { success: true }
}

export async function deleteUserAccount(): Promise<{ success: boolean; error?: any }> {
  const supabase = createClientComponentClient<Database>()

  try {
    // First check if the user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) {
      console.error("Auth error:", authError)
      return { success: false, error: "Authentication error: " + authError.message }
    }

    if (!user) {
      console.error("No authenticated user found")
      return { success: false, error: "You must be logged in to delete your account" }
    }

    // Now call the API to delete the account
    const response = await fetch("/api/user/delete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      // Include credentials to ensure cookies are sent
      credentials: "include",
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error("Error response from delete API:", errorData)
      return { success: false, error: errorData.error || "Failed to delete account" }
    }

    const result = await response.json()
    return { success: true }
  } catch (error) {
    console.error("Error deleting user account:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}
