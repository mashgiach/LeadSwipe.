"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { AlertCircle, Check, Loader2 } from "lucide-react"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import Link from "next/link"

export default function UpdatePasswordPage() {
  const router = useRouter()
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isValidLink, setIsValidLink] = useState(true)

  useEffect(() => {
    // Check if we have the hash fragment in the URL (Supabase adds this for password reset)
    const hasHashParams = window.location.hash && window.location.hash.includes("type=recovery")

    if (!hasHashParams) {
      setIsValidLink(false)
      setError("Invalid or expired password reset link. Please request a new one.")
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Reset states
    setError(null)
    setSuccess(false)

    // Validate passwords
    if (newPassword !== confirmPassword) {
      setError("Passwords don't match")
      return
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }

    setIsLoading(true)

    try {
      const supabase = getSupabaseBrowserClient()

      // Update the password
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) {
        throw new Error(error.message)
      }

      // Success
      setSuccess(true)

      // Redirect after a delay
      setTimeout(() => {
        router.push("/login")
      }, 3000)
    } catch (err: any) {
      setError(err.message || "Failed to update password")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <main className="flex-1 overflow-auto">
        <div className="flex flex-col h-full">
          <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Update Password</h1>
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

                  {success ? (
                    <div className="text-center py-6">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
                        <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Password Updated</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                        Your password has been successfully updated. You will be redirected to the login page.
                      </p>
                      <Button
                        onClick={() => router.push("/login")}
                        className="bg-gray-900 hover:bg-gray-800 text-white dark:bg-gray-800 dark:hover:bg-gray-700"
                      >
                        Go to Login
                      </Button>
                    </div>
                  ) : isValidLink ? (
                    <>
                      <div className="mb-4">
                        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-1">Create New Password</h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Please enter your new password below.
                        </p>
                      </div>

                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                          <Label
                            htmlFor="new-password"
                            className="text-sm font-medium text-gray-700 dark:text-gray-300"
                          >
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
                                Updating Password...
                              </>
                            ) : (
                              "Update Password"
                            )}
                          </Button>
                        </div>
                      </form>
                    </>
                  ) : (
                    <div className="text-center py-6">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
                        <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Invalid Reset Link</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                        This password reset link is invalid or has expired. Please request a new one.
                      </p>
                      <Button
                        onClick={() => router.push("/reset-password")}
                        className="bg-gray-900 hover:bg-gray-800 text-white dark:bg-gray-800 dark:hover:bg-gray-700"
                      >
                        Request New Link
                      </Button>
                    </div>
                  )}
                </div>
              </Card>

              <div className="mt-6 text-center">
                <Link
                  href="/login"
                  className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium"
                >
                  Back to Login
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
