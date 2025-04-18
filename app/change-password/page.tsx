"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { AlertCircle, ArrowLeft, Check, Loader2 } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import Link from "next/link"
import ProtectedRoute from "@/app/protected-route"

export default function ChangePasswordPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Reset states
    setError(null)
    setSuccess(false)

    // Validate passwords
    if (newPassword !== confirmPassword) {
      setError("New passwords don't match")
      return
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }

    setIsLoading(true)

    try {
      const supabase = getSupabaseBrowserClient()

      // First verify the current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || "",
        password: currentPassword,
      })

      if (signInError) {
        throw new Error("Current password is incorrect")
      }

      // Update the password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (updateError) {
        throw new Error(updateError.message)
      }

      // Success
      setSuccess(true)

      // Clear form
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")

      // Redirect after a delay
      setTimeout(() => {
        router.push("/settings?section=account")
      }, 2000)
    } catch (err: any) {
      setError(err.message || "Failed to change password")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        <main className="flex-1 overflow-auto">
          <div className="flex flex-col h-full">
            <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 flex items-center">
              <Link href="/settings?section=account" className="mr-4">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Change Password</h1>
            </div>

            <div className="flex-1 p-4 md:p-6">
              <div className="max-w-md mx-auto">
                <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm rounded-md">
                  <div className="p-4 md:p-6">
                    {error && (
                      <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md flex items-start">
                        <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mr-2 mt-0.5" />
                        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                      </div>
                    )}

                    {success && (
                      <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md flex items-start">
                        <Check className="h-5 w-5 text-green-600 dark:text-green-400 mr-2 mt-0.5" />
                        <p className="text-sm text-green-600 dark:text-green-400">
                          Password changed successfully! Redirecting...
                        </p>
                      </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label
                          htmlFor="current-password"
                          className="text-sm font-medium text-gray-700 dark:text-gray-300"
                        >
                          Current Password
                        </Label>
                        <Input
                          id="current-password"
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          required
                          className="w-full border-gray-300 dark:border-gray-700"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="new-password" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          New Password
                        </Label>
                        <Input
                          id="new-password"
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          required
                          className="w-full border-gray-300 dark:border-gray-700"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="confirm-password"
                          className="text-sm font-medium text-gray-700 dark:text-gray-300"
                        >
                          Confirm New Password
                        </Label>
                        <Input
                          id="confirm-password"
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          className="w-full border-gray-300 dark:border-gray-700"
                        />
                      </div>

                      <div className="pt-2">
                        <Button
                          type="submit"
                          disabled={isLoading}
                          className="w-full bg-gray-900 hover:bg-gray-800 text-white dark:bg-gray-800 dark:hover:bg-gray-700"
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Changing Password...
                            </>
                          ) : (
                            "Change Password"
                          )}
                        </Button>
                      </div>
                    </form>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
