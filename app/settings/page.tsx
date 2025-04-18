"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { SettingsForm } from "@/components/settings-form"
import { ProfileImageUpload } from "@/components/profile-image-upload"
import { SubscriptionPlans } from "@/components/subscription-plans"
import { DeleteAccountDialog } from "@/components/delete-account-dialog"
import { getCurrentSubscription, type SubscriptionPlan } from "@/services/account-service"
import { SideNav } from "@/components/side-nav"
import ProtectedRoute from "@/app/protected-route"
import { useSearchParams } from "next/navigation"
import { Settings, User, Activity, Tag, CreditCard, Shield, Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getUserProfile } from "@/services/user-profile-service"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"

export default function SettingsPage() {
  const { user } = useAuth()
  const [currentPlan, setCurrentPlan] = useState<SubscriptionPlan>("basic")
  const [activeSection, setActiveSection] = useState("profile")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    const section = searchParams.get("section")
    if (section) {
      setActiveSection(section)
    }
  }, [searchParams])

  useEffect(() => {
    const fetchSubscription = async () => {
      const plan = await getCurrentSubscription()
      setCurrentPlan(plan)
    }

    fetchSubscription()
  }, [])

  // Fetch user profile to get avatar URL
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return

      setIsLoadingProfile(true)
      try {
        const profile = await getUserProfile(user.id)
        if (profile) {
          setAvatarUrl(profile.avatar_url)
        }
      } catch (error) {
        console.error("Error fetching user profile:", error)
      } finally {
        setIsLoadingProfile(false)
      }
    }

    fetchUserProfile()
  }, [user])

  // Close sidebar when section changes on mobile
  useEffect(() => {
    setSidebarOpen(false)
  }, [activeSection])

  // Handle avatar update
  const handleAvatarUpdate = (url: string | null) => {
    setAvatarUrl(url)
  }

  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        <SideNav />
        <main className="flex-1 overflow-auto">
          <div className="flex flex-col h-full">
            <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 flex items-center justify-between">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Settings</h1>
              <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSidebarOpen(!sidebarOpen)}>
                {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>

            <div className="flex-1 p-0 flex">
              {/* Settings Sidebar - Mobile Overlay */}
              <div
                className={`fixed inset-0 bg-black/50 z-20 md:hidden ${sidebarOpen ? "block" : "hidden"}`}
                onClick={() => setSidebarOpen(false)}
              ></div>

              {/* Settings Sidebar - Desktop (always visible) */}
              <div className="hidden md:block w-64 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
                <nav className="space-y-1">
                  <button
                    onClick={() => setActiveSection("profile")}
                    className={`w-full text-left px-3 py-2 text-sm rounded-md flex items-center gap-2 ${
                      activeSection === "profile"
                        ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 font-medium"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`}
                  >
                    <User className="h-4 w-4" />
                    Profile
                  </button>
                  <button
                    onClick={() => setActiveSection("activity")}
                    className={`w-full text-left px-3 py-2 text-sm rounded-md flex items-center gap-2 ${
                      activeSection === "activity"
                        ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 font-medium"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`}
                  >
                    <Activity className="h-4 w-4" />
                    Activity
                  </button>
                  <button
                    onClick={() => setActiveSection("ai")}
                    className={`w-full text-left px-3 py-2 text-sm rounded-md flex items-center gap-2 ${
                      activeSection === "ai"
                        ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 font-medium"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`}
                  >
                    <Settings className="h-4 w-4" />
                    AI Settings
                  </button>
                  <button
                    onClick={() => setActiveSection("keywords")}
                    className={`w-full text-left px-3 py-2 text-sm rounded-md flex items-center gap-2 ${
                      activeSection === "keywords"
                        ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 font-medium"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`}
                  >
                    <Tag className="h-4 w-4" />
                    Keywords
                  </button>
                  <button
                    onClick={() => setActiveSection("subscription")}
                    className={`w-full text-left px-3 py-2 text-sm rounded-md flex items-center gap-2 ${
                      activeSection === "subscription"
                        ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 font-medium"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`}
                  >
                    <CreditCard className="h-4 w-4" />
                    Subscription
                  </button>
                  <button
                    onClick={() => setActiveSection("account")}
                    className={`w-full text-left px-3 py-2 text-sm rounded-md flex items-center gap-2 ${
                      activeSection === "account"
                        ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 font-medium"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`}
                  >
                    <Shield className="h-4 w-4" />
                    Account
                  </button>
                </nav>
              </div>

              {/* Settings Content */}
              <div className="flex-1 p-4 md:p-6 overflow-auto">
                {activeSection === "profile" && (
                  <div className="max-w-3xl">
                    <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-white">Profile Settings</h2>
                    <div className="space-y-6">
                      <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm rounded-md p-4 md:p-6">
                        <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">Profile Picture</h3>
                        <ProfileImageUpload avatarUrl={avatarUrl} onUpdate={handleAvatarUpdate} />
                      </Card>

                      <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm rounded-md">
                        <div className="p-4 md:p-6">
                          <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">
                            Profile Information
                          </h3>
                          <SettingsForm settings={null} isLoading={false} activeTab="profile" />
                        </div>
                      </Card>
                    </div>
                  </div>
                )}

                {activeSection === "activity" && (
                  <div className="max-w-full">
                    <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-white">Activity</h2>
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">Activity Overview</h3>
                        <div className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm rounded-md overflow-hidden">
                          <div className="p-6 flex flex-col items-center justify-center text-center">
                            <div className="inline-flex items-center justify-center rounded-full bg-amber-100 p-2 mb-4">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="text-amber-600"
                              >
                                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                              </svg>
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Coming Soon</h3>
                            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">
                              We're working on an improved activity tracking system to help you visualize your
                              engagement on the platform. This feature will be available in an upcoming update.
                            </p>
                            <div className="inline-flex items-center px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-md text-sm text-gray-700 dark:text-gray-300">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="mr-2"
                              >
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                              </svg>
                              Feature in development
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeSection === "ai" && (
                  <div className="max-w-3xl">
                    <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-white">AI Settings</h2>
                    <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm rounded-md">
                      <div className="p-4 md:p-6">
                        <SettingsForm settings={null} isLoading={false} activeTab="ai" />
                      </div>
                    </Card>
                  </div>
                )}

                {activeSection === "keywords" && (
                  <div className="max-w-3xl">
                    <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-white">Keywords</h2>
                    <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm rounded-md">
                      <div className="p-4 md:p-6">
                        <SettingsForm settings={null} isLoading={false} activeTab="keywords" />
                      </div>
                    </Card>
                  </div>
                )}

                {activeSection === "subscription" && (
                  <div className="max-w-3xl">
                    <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-white">Subscription</h2>
                    <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm rounded-md">
                      <div className="p-4 md:p-6">
                        <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">Subscription Plans</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                          You are currently on the <strong>Invitation Plan (Lux)</strong> plan. This is an exclusive
                          invitation-only platform.
                        </p>
                        <SubscriptionPlans currentPlan={currentPlan} onUpgrade={() => setCurrentPlan("plus")} />
                      </div>
                    </Card>
                  </div>
                )}

                {activeSection === "account" && (
                  <div className="max-w-3xl">
                    <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-white">Account Management</h2>
                    <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm rounded-md">
                      <div className="p-4 md:p-6">
                        <div className="space-y-6">
                          <div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Password Management</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              Update your password or request a password reset.
                            </p>
                            <div className="mt-4 flex flex-wrap gap-3">
                              <button
                                className="bg-gray-900 hover:bg-gray-800 text-white dark:bg-gray-800 dark:hover:bg-gray-700 px-4 py-2 rounded-md text-sm font-medium"
                                onClick={() => router.push("/change-password")}
                              >
                                Change Password
                              </button>
                              <button
                                className="bg-transparent hover:bg-gray-100 text-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md text-sm font-medium"
                                onClick={() => router.push("/reset-password")}
                              >
                                Reset Password
                              </button>
                            </div>
                          </div>

                          <div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Export Your Data</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              Download a copy of all your data including leads, settings, and profile information.
                            </p>
                            <div className="mt-4">
                              <button
                                className="bg-gray-900 hover:bg-gray-800 text-white dark:bg-gray-800 dark:hover:bg-gray-700 px-4 py-2 rounded-md text-sm font-medium"
                                onClick={handleExportData}
                              >
                                Export Data
                              </button>
                            </div>
                          </div>

                          <div className="border-t border-gray-200 dark:border-gray-800 pt-6 mt-6">
                            <h3 className="text-lg font-medium text-red-600 dark:text-red-500">Danger Zone</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              Once you delete your account, there is no going back. Please be certain.
                            </p>
                            <div className="mt-4">
                              <DeleteAccountDialog />
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>
                )}
              </div>

              {/* Settings Sidebar - Mobile (opens from right) */}
              <div
                className={`
                  ${sidebarOpen ? "translate-x-0" : "translate-x-full"} 
                  md:hidden transition-transform duration-200 ease-in-out
                  fixed top-0 bottom-0 right-0 z-30 
                  w-64 border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4
                `}
              >
                <div className="pt-14">
                  <nav className="space-y-1">
                    <button
                      onClick={() => setActiveSection("profile")}
                      className={`w-full text-left px-3 py-2 text-sm rounded-md flex items-center gap-2 ${
                        activeSection === "profile"
                          ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 font-medium"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                      }`}
                    >
                      <User className="h-4 w-4" />
                      Profile
                    </button>
                    <button
                      onClick={() => setActiveSection("activity")}
                      className={`w-full text-left px-3 py-2 text-sm rounded-md flex items-center gap-2 ${
                        activeSection === "activity"
                          ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 font-medium"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                      }`}
                    >
                      <Activity className="h-4 w-4" />
                      Activity
                    </button>
                    <button
                      onClick={() => setActiveSection("ai")}
                      className={`w-full text-left px-3 py-2 text-sm rounded-md flex items-center gap-2 ${
                        activeSection === "ai"
                          ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 font-medium"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                      }`}
                    >
                      <Settings className="h-4 w-4" />
                      AI Settings
                    </button>
                    <button
                      onClick={() => setActiveSection("keywords")}
                      className={`w-full text-left px-3 py-2 text-sm rounded-md flex items-center gap-2 ${
                        activeSection === "keywords"
                          ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 font-medium"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                      }`}
                    >
                      <Tag className="h-4 w-4" />
                      Keywords
                    </button>
                    <button
                      onClick={() => setActiveSection("subscription")}
                      className={`w-full text-left px-3 py-2 text-sm rounded-md flex items-center gap-2 ${
                        activeSection === "subscription"
                          ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 font-medium"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                      }`}
                    >
                      <CreditCard className="h-4 w-4" />
                      Subscription
                    </button>
                    <button
                      onClick={() => setActiveSection("account")}
                      className={`w-full text-left px-3 py-2 text-sm rounded-md flex items-center gap-2 ${
                        activeSection === "account"
                          ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 font-medium"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                      }`}
                    >
                      <Shield className="h-4 w-4" />
                      Account
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}

// Add export data functionality
function handleExportData() {
  try {
    // Fetch user data
    fetch("/api/user/export-data", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to export data")
        }
        return response.blob()
      })
      .then((blob) => {
        // Create a download link
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.style.display = "none"
        a.href = url
        a.download = "leadswipe-data-export.json"
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        alert("Data exported successfully!")
      })
      .catch((error) => {
        console.error("Error exporting data:", error)
        alert("Failed to export data. Please try again.")
      })
  } catch (error) {
    console.error("Error in export handler:", error)
    alert("An unexpected error occurred. Please try again.")
  }
}
